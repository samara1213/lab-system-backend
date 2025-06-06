import { Test, TestingModule } from '@nestjs/testing';
import { AllianceService } from './alliance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alliance } from './entities/alliance.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

// Mocks
const mockAllianceRepo = {
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  find: jest.fn(),
};
const mockLabRepo = {
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockExceptionService = { handleDBError: jest.fn() };

describe('AllianceService', () => {
  let service: AllianceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllianceService,
        { provide: getRepositoryToken(Alliance), useValue: mockAllianceRepo },
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<AllianceService>(AllianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una alianza', async () => {
    const dto = { ali_nombre: 'A', ali_direccion: 'D', ali_telefono: 'T', ali_nombre_contacto: 'C', ali_laboratory_id: 'uuid' };
    const lab = { lab_id: 'uuid' };
    mockLabRepo.create.mockReturnValue(lab);
    mockAllianceRepo.create.mockReturnValue({ ...dto, laboratory: lab });
    mockAllianceRepo.save.mockResolvedValue({ ...dto, laboratory: lab });
    const result = await service.create(dto as any);
    expect(mockAllianceRepo.create).toHaveBeenCalledWith({ ...dto, laboratory: lab });
    expect(mockAllianceRepo.save).toHaveBeenCalled();
    expect(result.status).toBe(201);
  });

 

  it('debería actualizar una alianza', async () => {
    const id = 'uuid';
    const dto = { ali_nombre: 'Nuevo' };
    const alliance = { ali_id: id, ...dto };
    mockAllianceRepo.preload.mockResolvedValue(alliance);
    mockAllianceRepo.save.mockResolvedValue(alliance);
    const result = await service.update(id, dto as any);
    expect(mockAllianceRepo.preload).toHaveBeenCalledWith({ ali_id: id, ...dto });
    expect(mockAllianceRepo.save).toHaveBeenCalledWith(alliance);
    expect(result.status).toBe(200);
  });

 
  it('debería listar alianzas por laboratorio', async () => {
    mockAllianceRepo.find.mockResolvedValue([{ ali_id: '1' }, { ali_id: '2' }]);
    const result = await service.findAllByLaboratory('uuid');
    expect(mockAllianceRepo.find).toHaveBeenCalledWith({ where: { laboratory: { lab_id: 'uuid' } } });
    expect(result.status).toBe(200);
    expect(result.data.length).toBe(2);
  });
});
