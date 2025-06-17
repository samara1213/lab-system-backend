import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { StorageService } from '../storage/storage.service';
import { ExceptionService } from '../exceptions/exception/exception.service';

const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue('ruta/fake.pdf'),
};
const mockExceptionService = { handleDBError: jest.fn() };

describe('PdfService', () => {
  let service: PdfService;
  let storageService: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<PdfService>(PdfService);
    storageService = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería generar un buffer de PDF', async () => {
    const fakeOrder = {
      laboratory: {},
      customer: {},
      exams: [],
    };
    const buffer = await service.generateExamResultsPdf(fakeOrder);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('debería subir el PDF a Supabase y retornar la ruta', async () => {
    const fakeOrder = {
      ord_id: '123',
      laboratory: {},
      customer: {},
      exams: [],
    };
    const result = await service.generateResult(fakeOrder);
    expect(storageService.uploadFile).toHaveBeenCalled();
    expect(result).toBe('ruta/fake.pdf');
  });
});
