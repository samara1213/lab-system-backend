import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { PdfTemplatesService } from './pdf-templates.service';
import { PdfTemplate } from './entities/pdf_template.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { PdfService } from './pdf.service';
import {
  sha256,
  TemplateResolverService,
} from './engine/template-resolver.service';
import { ExceptionService } from '../exceptions/exception/exception.service';

const txRepo = { update: jest.fn() };
const mockTemplateRepo = {
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ ...data, tpl_id: 'tpl-1' })),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  manager: {
    transaction: jest.fn(async (work) => work({ getRepository: () => txRepo })),
  },
};
const mockLabRepo = { findOne: jest.fn() };
const mockPdfService = {
  labLogo: jest.fn().mockResolvedValue(null),
  renderReport: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
};
const mockResolver = { getDefaultSource: jest.fn(() => '<p>base</p>') };
const mockExceptionService = {
  handleDBError: jest.fn((error) => {
    throw error;
  }),
};

const file = (content: string, originalname = 'plantilla.html') =>
  ({
    originalname,
    buffer: Buffer.from(content, 'utf8'),
    size: Buffer.byteLength(content),
  }) as Express.Multer.File;

const actor = { use_id: 'admin' } as any;

describe('PdfTemplatesService', () => {
  let service: PdfTemplatesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfTemplatesService,
        {
          provide: getRepositoryToken(PdfTemplate),
          useValue: mockTemplateRepo,
        },
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: PdfService, useValue: mockPdfService },
        { provide: TemplateResolverService, useValue: mockResolver },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get(PdfTemplatesService);
  });

  describe('create', () => {
    it('guarda la plantilla inactiva con su sha256, tamaño y quien la subió', async () => {
      const content = '<p>{{paciente.nombre}}</p>';
      const result = await service.create(actor, file(content), {
        tpl_name: ' Plantilla A ',
      });
      expect(result.status).toBe(201);
      expect(mockTemplateRepo.create).toHaveBeenCalledWith({
        tpl_name: 'Plantilla A',
        tpl_description: null,
        tpl_content: content,
        tpl_sha256: sha256(content),
        tpl_size: Buffer.byteLength(content),
        tpl_active: false,
        laboratory: null,
        createdBy: { use_id: 'admin' },
      });
    });

    it('rechaza una plantilla con errores y devuelve la lista', async () => {
      await expect(
        service.create(actor, file('{{{paciente.nombre}}}{{> x}}'), {
          tpl_name: 'X',
        }),
      ).rejects.toMatchObject({
        response: {
          message: expect.arrayContaining([
            expect.stringContaining('sin escapar'),
            expect.stringContaining('parciales'),
          ]),
        },
      });
      expect(mockTemplateRepo.save).not.toHaveBeenCalled();
    });

    it.each([
      ['sin archivo', undefined],
      ['otra extensión', file('<p></p>', 'plantilla.txt')],
      [
        'texto que no es UTF-8',
        { ...file(''), buffer: Buffer.from([0xff, 0xfe, 0x00]), size: 3 },
      ],
    ])('rechaza %s', async (_case, upload) => {
      await expect(
        service.create(actor, upload as any, { tpl_name: 'X' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('responde 404 si el laboratorio indicado no existe', async () => {
      mockLabRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create(actor, file('<p></p>'), {
          tpl_name: 'X',
          laboratory: 'lab-x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('activate', () => {
    it('desactiva la activa del mismo laboratorio y activa esta en una transacción', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({
        tpl_id: 'tpl-1',
        laboratory: { lab_id: 'lab-a' },
      });
      await service.activate('tpl-1');
      expect(txRepo.update).toHaveBeenNthCalledWith(
        1,
        { tpl_active: true, laboratory: { lab_id: 'lab-a' } },
        { tpl_active: false },
      );
      expect(txRepo.update).toHaveBeenNthCalledWith(
        2,
        { tpl_id: 'tpl-1' },
        { tpl_active: true },
      );
    });

    it('una del sistema reemplaza solo a la activa del sistema', async () => {
      mockTemplateRepo.findOne.mockResolvedValue({
        tpl_id: 'tpl-2',
        laboratory: null,
      });
      await service.activate('tpl-2');
      expect(txRepo.update).toHaveBeenNthCalledWith(
        1,
        { tpl_active: true, laboratory: IsNull() },
        { tpl_active: false },
      );
    });
  });

  it('no elimina una plantilla activa', async () => {
    mockTemplateRepo.findOne.mockResolvedValue({
      tpl_id: 'tpl-1',
      tpl_active: true,
    });
    await expect(service.remove('tpl-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockTemplateRepo.delete).not.toHaveBeenCalled();
  });

  it('la vista previa de un archivo imprime los datos de ejemplo con el laboratorio elegido', async () => {
    mockLabRepo.findOne.mockResolvedValue({
      lab_id: 'lab-a',
      lab_name: 'Lab A',
      lab_logo: 'logo.png',
    });
    const pdf = await service.previewFile(
      file('<p>{{laboratorio.nombre}} {{paciente.nombre}}</p>'),
      'lab-a',
    );
    expect(pdf).toEqual(Buffer.from('%PDF'));
    expect(mockPdfService.labLogo).toHaveBeenCalledWith('logo.png');
    const [compiled, report] = mockPdfService.renderReport.mock.calls[0];
    expect(compiled(report)).toBe('<p>Lab A María Fernanda Pérez López</p>');
  });
});
