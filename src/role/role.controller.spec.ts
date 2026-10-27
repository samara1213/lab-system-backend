import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { userWith } from '../permissions/permissions.test-helpers';

describe('RoleController', () => {
  let controller: RoleController;

  const mockRoleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findModules: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = userWith({ roles: { view: true } });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: mockRoleService }],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    jest.clearAllMocks();
  });

  it('pasa el usuario autenticado al servicio en cada operación', async () => {
    const dto = { rol_nombre: 'X', permissions: [] };
    await controller.create(dto, user);
    expect(mockRoleService.create).toHaveBeenCalledWith(dto, user);

    await controller.findAll({ laboratory: 'lab-b' }, user);
    expect(mockRoleService.findAll).toHaveBeenCalledWith(user, 'lab-b');

    await controller.findModules(user);
    expect(mockRoleService.findModules).toHaveBeenCalledWith(user);

    await controller.findOne('r', user);
    expect(mockRoleService.findOne).toHaveBeenCalledWith('r', user);

    await controller.update('r', { rol_nombre: 'Y' }, user);
    expect(mockRoleService.update).toHaveBeenCalledWith(
      'r',
      { rol_nombre: 'Y' },
      user,
    );

    await controller.remove('r', user);
    expect(mockRoleService.remove).toHaveBeenCalledWith('r', user);
  });
});
