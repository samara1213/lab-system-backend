import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

describe('MenuController', () => {
  let controller: MenuController;
  let service: MenuService;

  const mockMenuService = {
    create: jest.fn(dto => ({ status: 201, message: 'la opcion de menú se ha creado correctamente' })),
    findAll: jest.fn(() => ({ status: 200, data: [] })),
    update: jest.fn((id, dto) => ({ status: 200, message: 'La opción de menú se ha actualizado correctamente' })),
    getMenuParentByLevel: jest.fn(level => ({ status: 200, data: [{ men_level: level }] })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        {
          provide: MenuService,
          useValue: mockMenuService,
        },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    service = module.get<MenuService>(MenuService);
  });

  it('debería estar definido el controlador', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un menú', () => {
    const dto: CreateMenuDto = { men_name: 'Test', men_level: 1 };
    expect(controller.create(dto)).toEqual({ status: 201, message: 'la opcion de menú se ha creado correctamente' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los menús', () => {
    expect(controller.findAll()).toEqual({ status: 200, data: [] });
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería actualizar un menú', () => {
    const dto: UpdateMenuDto = { men_name: 'Updated' } as any;
    expect(controller.update('uuid', dto)).toEqual({ status: 200, message: 'La opción de menú se ha actualizado correctamente' });
    expect(service.update).toHaveBeenCalledWith('uuid', dto);
  });

  it('debería obtener menús por nivel', () => {
    expect(controller.getMenuParentByLevel(2)).toEqual({ status: 200, data: [{ men_level: 2 }] });
    expect(service.getMenuParentByLevel).toHaveBeenCalledWith(2);
  });
});
