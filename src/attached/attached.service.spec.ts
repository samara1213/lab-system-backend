import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttachedService } from './attached.service';
import { Attached } from './entities/attached.entity';
import { PdfService } from '../pdf/pdf.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { Order } from '../orders/entities/order.entity';

describe('AttachedService', () => {
  let service: AttachedService;
  const mockManager = { exists: jest.fn() };
  const mockAttachedRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: mockManager,
  };
  const mockPdfService = { uploadFileBuffer: jest.fn() };
  // el servicio real de excepciones propaga las HttpException
  const mockExceptionService = { handleDBError: jest.fn((error) => { throw error; }) };

  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const file = (buffer: Buffer) => ({ buffer, originalname: '../../evil name.png' }) as Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachedService,
        { provide: getRepositoryToken(Attached), useValue: mockAttachedRepo },
        { provide: PdfService, useValue: mockPdfService },
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
    await expect(service.create('ord-1', 'lab-a', file(png))).rejects.toBeInstanceOf(NotFoundException);
    expect(mockManager.exists).toHaveBeenCalledWith(Order, { where: { ord_id: 'ord-1', laboratory: { lab_id: 'lab-a' } } });
    expect(mockPdfService.uploadFileBuffer).not.toHaveBeenCalled();
  });

  it('rechaza un archivo cuyo contenido no es PDF ni imagen', async () => {
    mockManager.exists.mockResolvedValue(true);
    await expect(service.create('ord-1', 'lab-a', file(Buffer.from('<html><script>alert(1)</script></html>'))))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(mockPdfService.uploadFileBuffer).not.toHaveBeenCalled();
  });

  it('rechaza la petición sin archivo', async () => {
    mockManager.exists.mockResolvedValue(true);
    await expect(service.create('ord-1', 'lab-a', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sube el archivo con el tipo detectado y lo asocia a la orden', async () => {
    mockManager.exists.mockResolvedValue(true);
    mockPdfService.uploadFileBuffer.mockResolvedValue('lab-a/adjuntos/uuid.png');
    mockAttachedRepo.findOne.mockResolvedValue(null);
    mockAttachedRepo.create.mockImplementation((data) => data);
    const result = await service.create('ord-1', 'lab-a', file(png));
    // el nombre original del cliente no se usa: solo el buffer, el laboratorio y el tipo real
    expect(mockPdfService.uploadFileBuffer).toHaveBeenCalledWith(png, 'lab-a', { ext: 'png', mime: 'image/png' });
    expect(mockAttachedRepo.save).toHaveBeenCalledWith({ order: { ord_id: 'ord-1' }, att_file_url: 'lab-a/adjuntos/uuid.png' });
    expect(result.status).toBe(201);
  });
});
