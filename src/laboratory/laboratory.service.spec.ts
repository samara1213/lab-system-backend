import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryService } from './laboratory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Laboratory } from './entities/laboratory.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

const mockLabRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  preload: jest.fn(),
};
const mockExceptionService = { handleDBError: jest.fn() };

describe('LaboratoryService', () => {
  let service: LaboratoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryService,
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<LaboratoryService>(LaboratoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un laboratorio', async () => {
    const dto = { lab_nit: '123', lab_name: 'Lab', lab_address: '', lab_phone: '', lab_status: '', lab_email: '', lab_legal_representative: '' };
    const lab = { ...dto };
    mockLabRepo.create.mockReturnValue(lab);
    mockLabRepo.save.mockResolvedValue(lab);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockLabRepo.create).toHaveBeenCalledWith(dto);
    expect(mockLabRepo.save).toHaveBeenCalled();
  });

  it('debería retornar todos los laboratorios', async () => {
    const labs = [{ lab_id: '1' }, { lab_id: '2' }];
    mockLabRepo.find.mockResolvedValue(labs);
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toEqual(labs);
    expect(mockLabRepo.find).toHaveBeenCalled();
  });

  it('debería retornar un laboratorio por id', async () => {
    const lab = { lab_id: 'exists' };
    mockLabRepo.findOneBy.mockResolvedValue(lab);
    const result = await service.findOne('exists');
    expect(result.status).toBe(200);
    expect(result.data.lab_id).toBe('exists');
    expect(mockLabRepo.findOneBy).toHaveBeenCalledWith({ lab_id: 'exists' });
  });

  it('debería actualizar un laboratorio', async () => {
    const lab = { lab_id: 'exists', lab_name: 'Updated' };
    mockLabRepo.preload.mockResolvedValueOnce(lab);
    mockLabRepo.save.mockResolvedValueOnce(lab);
    const result = await service.update('exists', { lab_name: 'Updated' } as any);
    expect(result.status).toBe(200);
    expect(mockLabRepo.preload).toHaveBeenCalledWith({ lab_id: 'exists', lab_name: 'Updated' });
    expect(mockLabRepo.save).toHaveBeenCalled();
  });
});
