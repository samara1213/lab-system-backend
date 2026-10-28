import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttachedService } from './attached.service';
import { Attached } from './entities/attached.entity';
import { PdfService } from '../pdf/pdf.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { Order } from '../orders/entities/order.entity';
import { StorageService } from '../storage/storage.service';

describe('AttachedService', () => {
  let service: AttachedService;
  const mockManager = { exists: jest.fn() };
  const mockAttachedRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: mockManager,
  };
  const mockPdfService = { uploadFileBuffer: jest.fn() };
  const mockStorageService = { deleteFile: jest.fn(), getSignedUrl: jest.fn() };
  // el servicio real de excepciones propaga las HttpException
  const mockExceptionService = {
    handleDBError: jest.fn((error) => {
      throw error;
    }),
  };

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32),
  ]);
  const file = (buffer: Buffer) =>
    ({ buffer, originalname: '../../evil name.png' }) as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachedService,
        { provide: getRepositoryToken(Attached), useValue: mockAttachedRepo },
        { provide: PdfService, useValue: mockPdfService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();

    service = module.get<AttachedService>(AttachedService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('no adjunta archivos a una orden de otro laboratorio', async () => {
    mockManager.exists.mockResolvedValue(false);
    await expect(
      service.create('ord-1', 'lab-a', file(png)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockManager.exists).toHaveBeenCalledWith(Order, {
      where: { ord_id: 'ord-1', laboratory: { lab_id: 'lab-a' } },
    });
    expect(mockPdfService.uploadFileBuffer).not.toHaveBeenCalled();
  });

  it('rechaza un archivo cuyo contenido no es PDF ni imagen', async () => {
    mockManager.exists.mockResolvedValue(true);
    await expect(
      service.create(
        'ord-1',
        'lab-a',
        file(Buffer.from('<html><script>alert(1)</script></html>')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPdfService.uploadFileBuffer).not.toHaveBeenCalled();
  });

  it('rechaza la petición sin archivo', async () => {
    mockManager.exists.mockResolvedValue(true);
    await expect(
      service.create('ord-1', 'lab-a', undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sube el archivo con el tipo detectado y lo asocia a la orden', async () => {
    mockManager.exists.mockResolvedValue(true);
    mockPdfService.uploadFileBuffer.mockResolvedValue(
      'lab-a/adjuntos/uuid.png',
    );
    mockAttachedRepo.findOne.mockResolvedValue(null);
    mockAttachedRepo.create.mockImplementation((data) => data);
    const result = await service.create('ord-1', 'lab-a', file(png));
    // el nombre original del cliente no se usa: solo el buffer, el laboratorio y el tipo real
    expect(mockPdfService.uploadFileBuffer).toHaveBeenCalledWith(png, 'lab-a', {
      ext: 'png',
      mime: 'image/png',
    });
    expect(mockAttachedRepo.save).toHaveBeenCalledWith({
      order: { ord_id: 'ord-1' },
      att_file_url: 'lab-a/adjuntos/uuid.png',
    });
    expect(result.status).toBe(201);
  });

  it('al reemplazar el adjunto borra el archivo anterior del bucket', async () => {
    mockManager.exists.mockResolvedValue(true);
    mockPdfService.uploadFileBuffer.mockResolvedValue(
      'lab-a/adjuntos/nuevo.png',
    );
    mockAttachedRepo.findOne.mockResolvedValue({
      att_id: 'att-1',
      att_file_url: 'lab-a/adjuntos/viejo.png',
    });
    const result = await service.create('ord-1', 'lab-a', file(png));
    expect(result.status).toBe(200);
    expect(mockAttachedRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ att_file_url: 'lab-a/adjuntos/nuevo.png' }),
    );
    expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
      'lab-a/adjuntos/viejo.png',
    );
  });

  it('lista los adjuntos de la orden sin la ruta en Storage', async () => {
    mockManager.exists.mockResolvedValue(true);
    mockAttachedRepo.find.mockResolvedValue([
      {
        att_id: 'a1',
        att_created_at: 'hoy',
        att_file_url: 'lab-a/adjuntos/x.PDF',
      },
      {
        att_id: 'a2',
        att_created_at: 'ayer',
        att_file_url: 'lab-a/adjuntos/y.jpg',
      },
    ]);
    const result = await service.findByOrder('ord-1', 'lab-a');
    expect(result.data).toEqual([
      { att_id: 'a1', att_created_at: 'hoy', type: 'pdf' },
      { att_id: 'a2', att_created_at: 'ayer', type: 'image' },
    ]);
  });

  it('no lista adjuntos de una orden de otro laboratorio', async () => {
    mockManager.exists.mockResolvedValue(false);
    await expect(service.findByOrder('ord-b', 'lab-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockAttachedRepo.find).not.toHaveBeenCalled();
  });

  it('da una URL de 10 minutos y elimina adjuntos solo del laboratorio del usuario', async () => {
    mockAttachedRepo.findOne.mockResolvedValue({
      att_id: 'a1',
      att_file_url: 'lab-a/adjuntos/x.pdf',
    });
    mockStorageService.getSignedUrl.mockResolvedValue('https://firmada');
    const view = await service.getViewUrl('a1', 'lab-a');
    expect(view.data.url).toBe('https://firmada');
    expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith(
      'lab-a/adjuntos/x.pdf',
      600,
    );
    expect(mockAttachedRepo.findOne).toHaveBeenCalledWith({
      where: { att_id: 'a1', order: { laboratory: { lab_id: 'lab-a' } } },
    });

    await service.remove('a1', 'lab-a');
    expect(mockAttachedRepo.delete).toHaveBeenCalledWith({ att_id: 'a1' });
    expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
      'lab-a/adjuntos/x.pdf',
    );

    mockAttachedRepo.findOne.mockResolvedValue(null);
    await expect(service.remove('a-otro', 'lab-a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
