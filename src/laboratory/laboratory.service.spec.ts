import { Test, TestingModule } from '@nestjs/testing';
import { LaboratoryService } from './laboratory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Laboratory } from './entities/laboratory.entity';
import { Repository } from 'typeorm';

describe('LaboratoryService', () => {
  let service: LaboratoryService;
  let repository: Repository<Laboratory>;

  const mockRepository = {
    create: jest.fn(dto => dto),
    save: jest.fn(entity => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    findOneBy: jest.fn(({ lab_id }) => Promise.resolve(lab_id === 'exists' ? { lab_id } : null)),
    preload: jest.fn(({ lab_id, ...rest }) => Promise.resolve(lab_id === 'exists' ? { lab_id, ...rest } : null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LaboratoryService,
        {
          provide: getRepositoryToken(Laboratory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LaboratoryService>(LaboratoryService);
    repository = module.get<Repository<Laboratory>>(getRepositoryToken(Laboratory));
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un laboratorio', async () => {
    const dto = { lab_nit: '123', lab_name: 'Lab', lab_address: '', lab_phone: '', lab_status: '', lab_email: '', lab_legal_representative: '' };
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debería retornar todos los laboratorios', async () => {
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(mockRepository.find).toHaveBeenCalled();
  });

  it('debería retornar un laboratorio por id', async () => {
    const result = await service.findOne('exists');
    expect(result.status).toBe(200);
    expect(result.data.lab_id).toBe('exists');
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ lab_id: 'exists' });
  });

  it('debería actualizar un laboratorio', async () => {
    mockRepository.preload.mockResolvedValueOnce({ lab_id: 'exists', lab_name: 'Updated' });
    mockRepository.save.mockResolvedValueOnce({ lab_id: 'exists', lab_name: 'Updated' });
    const result = await service.update('exists', { lab_name: 'Updated' } as any);
    expect(result.status).toBe(200);
    expect(mockRepository.preload).toHaveBeenCalledWith({ lab_id: 'exists', lab_name: 'Updated' });
    expect(mockRepository.save).toHaveBeenCalled();
  });
  
});
