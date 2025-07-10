import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('RoleService', () => {
  let service: RoleService;
  const mockRoleRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    preload: jest.fn(),
  };
  const mockExceptionService = { handleDBError: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<RoleService>(RoleService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un rol', async () => {
    const dto = { name: 'admin', menus: ['1', '2'] };
    const role = { ...dto, menus: [{ men_id: '1' }, { men_id: '2' }] };
    mockRoleRepo.create.mockReturnValue(role);
    mockRoleRepo.save.mockResolvedValue(role);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockRoleRepo.create).toHaveBeenCalledWith({ name: 'admin' });
    expect(mockRoleRepo.save).toHaveBeenCalledWith(role);
  });

  it('debería retornar todos los roles', async () => {
    const roles = [{ rol_id: '1' }, { rol_id: '2' }];
    mockRoleRepo.find.mockResolvedValue(roles);
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toEqual(roles);
    expect(mockRoleRepo.find).toHaveBeenCalled();
  });

  it('debería retornar un rol por id', async () => {
    const role = { rol_id: '1' };
    mockRoleRepo.findOneBy.mockResolvedValue(role);
    const result = await service.findOne('1');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(role);
    expect(mockRoleRepo.findOneBy).toHaveBeenCalledWith({ rol_id: '1' });
  });

  it('debería actualizar un rol', async () => {
    const dto = { name: 'nuevo', menus: ['1'] };
    const role = { rol_id: '1', name: 'nuevo', menus: [{ men_id: '1' }] };
    mockRoleRepo.preload.mockResolvedValue(role);
    mockRoleRepo.save.mockResolvedValue(role);
    const result = await service.update('1', dto as any);
    expect(result.status).toBe(200);
    expect(mockRoleRepo.preload).toHaveBeenCalledWith({ rol_id: '1', name: 'nuevo' });
    expect(mockRoleRepo.save).toHaveBeenCalledWith(role);
  });
});
