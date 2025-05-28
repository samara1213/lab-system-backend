import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

describe('RoleController', () => {
  let controller: RoleController;
  let service: RoleService;

  const mockRoleService = {
    create: jest.fn(dto => ({ status: 201, message: 'El registo de rol se ha creado correctamente' })),
    findAll: jest.fn(() => ({ status: 200, data: [] })),
    findOne: jest.fn(id => ({ status: 200, data: { rol_id: id } })),
    update: jest.fn((id, dto) => ({ status: 200, message: 'El rol se ha actualizado correctamente' })),
    remove: jest.fn(id => ({ status: 200, message: 'El rol se ha eliminado correctamente' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
        },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
    service = module.get<RoleService>(RoleService);
  });

  it('debería estar definido el controlador', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un rol', () => {
    const dto: CreateRoleDto = { rol_nombre: 'Admin', menus: ['uuid1', 'uuid2'] };
    expect(controller.create(dto)).toEqual({ status: 201, message: 'El registo de rol se ha creado correctamente' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los roles', () => {
    expect(controller.findAll()).toEqual({ status: 200, data: [] });
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería retornar un rol por id', () => {
    expect(controller.findOne('uuid')).toEqual({ status: 200, data: { rol_id: 'uuid' } });
    expect(service.findOne).toHaveBeenCalledWith('uuid');
  });

  it('debería actualizar un rol', () => {
    const dto: UpdateRoleDto = { rol_nombre: 'Updated', menus: ['uuid1'] } as any;
    expect(controller.update('uuid', dto)).toEqual({ status: 200, message: 'El rol se ha actualizado correctamente' });
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
  });

});
