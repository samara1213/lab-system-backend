import { Test, TestingModule } from '@nestjs/testing';
import { AllianceService } from './alliance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Alliance } from './entities/alliance.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { BadRequestException } from '@nestjs/common';

describe('AllianceService', () => {
  let service: AllianceService;
  let allianceRepo: any;
  let laboratoryRepo: any;

  beforeEach(async () => {
    allianceRepo = {
      create: jest.fn(),
      save: jest.fn(),
      preload: jest.fn(),
      find: jest.fn(),
    };
    laboratoryRepo = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllianceService,
        { provide: getRepositoryToken(Alliance), useValue: allianceRepo },
        { provide: getRepositoryToken(Laboratory), useValue: laboratoryRepo },
      ],
    }).compile();
    service = module.get<AllianceService>(AllianceService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una alianza', async () => {
    const dto = { ali_nombre: 'A', ali_direccion: 'D', ali_telefono: 'T', ali_nombre_contacto: 'C', ali_laboratory_id: 'uuid' };
    const lab = { lab_id: 'uuid' };
    laboratoryRepo.create.mockReturnValue(lab);
    allianceRepo.create.mockReturnValue({ ...dto, laboratory: lab });
    allianceRepo.save.mockResolvedValue({ ...dto, laboratory: lab });
    const result = await service.create(dto as any);
    expect(allianceRepo.create).toHaveBeenCalledWith({ ...dto, laboratory: lab });
    expect(allianceRepo.save).toHaveBeenCalled();
    expect(result.status).toBe(201);
  });

  it('debería lanzar error si laboratorio no existe al crear', async () => {
    const dto = { ali_nombre: 'A', ali_direccion: 'D', ali_telefono: 'T', ali_nombre_contacto: 'C', ali_laboratory_id: 'uuid' };
    laboratoryRepo.create.mockReturnValue(undefined);
    allianceRepo.create.mockReturnValue({ ...dto, laboratory: undefined });
    allianceRepo.save.mockImplementation(() => { throw { code: '23505' }; });
    await expect(service.create(dto as any)).rejects.toThrow();
  });

  it('debería actualizar una alianza', async () => {
    const id = 'uuid';
    const dto = { ali_nombre: 'Nuevo' };
    const alliance = { ali_id: id, ...dto };
    allianceRepo.preload.mockResolvedValue(alliance);
    allianceRepo.save.mockResolvedValue(alliance);
    const result = await service.update(id, dto as any);
    expect(allianceRepo.preload).toHaveBeenCalledWith({ ali_id: id, ...dto });
    expect(allianceRepo.save).toHaveBeenCalledWith(alliance);
    expect(result.status).toBe(200);
  });

  it('debería lanzar error si la alianza no existe al actualizar', async () => {
    allianceRepo.preload.mockResolvedValue(undefined);
    await expect(service.update('uuid', { ali_nombre: 'Nuevo' } as any)).rejects.toThrow(BadRequestException);
  });

  it('debería listar alianzas por laboratorio', async () => {
    allianceRepo.find.mockResolvedValue([{ ali_id: '1' }, { ali_id: '2' }]);
    const result = await service.findAllByLaboratory('uuid');
    expect(allianceRepo.find).toHaveBeenCalledWith({ where: { laboratory: { lab_id: 'uuid' } } });
    expect(result.status).toBe(200);
    expect(result.data.length).toBe(2);
  });
});
