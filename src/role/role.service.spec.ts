import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

describe('RoleService', () => {
  let service: RoleService;
  let repository: Repository<Role>;

  const mockRepository = {
    create: jest.fn(dto => dto),
    save: jest.fn(entity => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    findOneBy: jest.fn(({ rol_id }) => Promise.resolve(rol_id === 'exists' ? { rol_id } : null)),
    preload: jest.fn(({ rol_id, ...rest }) => Promise.resolve(rol_id === 'exists' ? { rol_id, ...rest } : null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    repository = module.get<Repository<Role>>(getRepositoryToken(Role));
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un rol', async () => {
    const dto = { rol_nombre: 'Admin', menus: ['uuid1', 'uuid2'] };
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    // La llamada real a create incluye solo los datos del rol, sin los menús
    expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ rol_nombre: 'Admin' }));
    // La llamada a save incluye los menús como objetos con men_id
    expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ rol_nombre: 'Admin', menus: [{ men_id: 'uuid1' }, { men_id: 'uuid2' }] }));
  });

  it('debería retornar todos los roles', async () => {
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(mockRepository.find).toHaveBeenCalled();
  });

  it('debería retornar un rol por id', async () => {
    const result = await service.findOne('exists');
    expect(result.status).toBe(200);
    expect(result.data.rol_id).toBe('exists');
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ rol_id: 'exists' });
  });

  it('debería lanzar error si el rol no existe', async () => {
    await expect(service.findOne('not-exists')).rejects.toThrow();
  });

  it('debería actualizar un rol', async () => {
    mockRepository.preload.mockResolvedValueOnce({ rol_id: 'exists', rol_nombre: 'Updated' });
    mockRepository.save.mockResolvedValueOnce({ rol_id: 'exists', rol_nombre: 'Updated' });
    const result = await service.update('exists', { rol_nombre: 'Updated', menus: ['uuid1'] } as any);
    expect(result.status).toBe(200);
    expect(mockRepository.preload).toHaveBeenCalledWith({ rol_id: 'exists', rol_nombre: 'Updated' });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debería lanzar error si el rol a actualizar no existe', async () => {
    mockRepository.preload.mockResolvedValueOnce(null);
    await expect(service.update('not-exists', { rol_nombre: 'Updated', menus: [] } as any)).rejects.toThrow();
  });
});
