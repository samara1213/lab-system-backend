import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

describe('RoleController', () => {
  let controller: RoleController;
  let service: RoleService;

  const mockRoleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        { provide: RoleService, useValue: mockRoleService },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un rol', async () => {
    const dto: CreateRoleDto = { name: 'admin' } as any;
    const expected = { status: 201, message: 'ok' };
    mockRoleService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los roles', async () => {
    const expected = { status: 200, data: [] };
    mockRoleService.findAll.mockResolvedValue(expected);
    const result = await controller.findAll();
    expect(result).toEqual(expected);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería retornar un rol por id', async () => {
    const expected = { status: 200, data: { rol_id: '1' } };
    mockRoleService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne('1');
    expect(result).toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('debería actualizar un rol', async () => {
    const dto: UpdateRoleDto = { name: 'nuevo' } as any;
    const expected = { status: 200, message: 'ok' };
    mockRoleService.update.mockResolvedValue(expected);
    const result = await controller.update('1', dto);
    expect(result).toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });
});
