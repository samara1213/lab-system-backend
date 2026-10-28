import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { StorageService } from '../storage/storage.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { PdfRendererService } from './engine/pdf-renderer.service';
import { TemplateResolverService } from './engine/template-resolver.service';

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
  'hex',
);

const mockStorageService = {
  uploadFile: jest.fn(async (_buffer, path) => path),
  getPrivateImageBuffer: jest.fn(),
};
const mockRenderer = {
  render: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
};
const template = jest.fn(
  (_report?: unknown) =>
    '<html><head></head><body><!-- pdf:header -->H<!-- /pdf:header -->cuerpo</body></html>',
);
const mockResolver = { forLaboratory: jest.fn().mockResolvedValue(template) };
// el servicio real de excepciones propaga las HttpException
const mockExceptionService = {
  handleDBError: jest.fn((error) => {
    throw error;
  }),
};

const order = (overrides = {}) => ({
  ord_id: 'ord-1',
  laboratory: { lab_id: 'lab-a', lab_logo: 'logo.png' },
  customer: {},
  exams: [
    {
      exa_name: 'A',
      signer: { use_id: 'u1', firma_path: 'lab-a/firmas/u1' },
      parameters: [],
    },
    {
      exa_name: 'B',
      signer: { use_id: 'u1', firma_path: 'lab-a/firmas/u1' },
      parameters: [],
    },
  ],
  attachedFiles: [
    { att_file_url: 'lab-a/adjuntos/foto' },
    { att_file_url: 'lab-a/adjuntos/doc' },
  ],
  ...overrides,
});

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: ExceptionService, useValue: mockExceptionService },
        { provide: PdfRendererService, useValue: mockRenderer },
        { provide: TemplateResolverService, useValue: mockResolver },
      ],
    }).compile();
    service = module.get(PdfService);
    // el adjunto "doc" no es una imagen (un PDF): no se incrusta
    mockStorageService.getPrivateImageBuffer.mockImplementation(async (path) =>
      path.endsWith('doc') ? Buffer.from('%PDF-1.7 documento') : PNG,
    );
  });

  it('genera el PDF con la plantilla del laboratorio y lo sube con un nombre nuevo, sin reemplazar', async () => {
    const path = await service.generateResult(order());
    expect(mockResolver.forLaboratory).toHaveBeenCalledWith('lab-a');
    expect(path).toMatch(/^lab-a\/resultados\/ord-1\/[0-9a-f-]{36}\.pdf$/);
    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      Buffer.from('%PDF'),
      path,
      'application/pdf',
      false,
    );
    // el encabezado se separa del cuerpo
    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ headerTemplate: 'H' }),
    );
  });

  it('descarga logo, firmas (una vez por firmante) e imágenes adjuntas y omite lo que no es imagen', async () => {
    await service.generateResult(order());
    const paths = mockStorageService.getPrivateImageBuffer.mock.calls.map(
      ([path]) => path,
    );
    expect(paths.sort()).toEqual(
      [
        'lab-a/adjuntos/doc',
        'lab-a/adjuntos/foto',
        'lab-a/firmas/u1',
        'logos_empresa/logo.png',
      ].sort(),
    );
    const report = template.mock.calls[0][0] as any;
    expect(report.imagenes).toEqual([
      `data:image/png;base64,${PNG.toString('base64')}`,
    ]);
    expect(report.laboratorio.logo).toMatch(/^data:image\/png;base64,/);
    expect(report.clasificaciones[0].examenes[0].firmante.firma).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it('reutiliza logo y firmas entre PDF, pero vuelve a descargar los adjuntos', async () => {
    await service.generateResult(order());
    await service.generateResult(order());
    const calls = mockStorageService.getPrivateImageBuffer.mock.calls.map(
      ([path]) => path,
    );
    expect(calls.filter((p) => p === 'logos_empresa/logo.png')).toHaveLength(1);
    expect(calls.filter((p) => p === 'lab-a/firmas/u1')).toHaveLength(1);
    expect(calls.filter((p) => p === 'lab-a/adjuntos/foto')).toHaveLength(2);
  });

  it('genera el PDF aunque una imagen no se pueda descargar', async () => {
    mockStorageService.getPrivateImageBuffer.mockRejectedValue(
      new Error('no existe'),
    );
    await expect(
      service.generateResult(order({ ord_id: 'ord-2' })),
    ).resolves.toMatch(/^lab-a\/resultados\/ord-2\//);
  });
});
