import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

describe('MenuController', () => {
  let controller: MenuController;
  let service: MenuService;

  const mockMenuService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    getMenuParentByLevel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        { provide: MenuService, useValue: mockMenuService },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    service = module.get<MenuService>(MenuService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería crear un menú', async () => {
    const dto: CreateMenuDto = {
      men_name: 'Inicio',
      men_url: '/inicio',
      men_icon: 'home',
      men_level: 1,
    };
    const expected = { status: 201, message: 'ok' };
    mockMenuService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería retornar todos los menús', async () => {
    const expected = { status: 200, data: [] };
    mockMenuService.findAll.mockResolvedValue(expected);
    const result = await controller.findAll();
    expect(result).toEqual(expected);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('debería actualizar un menú', async () => {
    const dto: UpdateMenuDto = { men_name: 'Nuevo' };
    const expected = { status: 200, message: 'ok' };
    mockMenuService.update.mockResolvedValue(expected);
    const result = await controller.update('1', dto);
    expect(result).toEqual(expected);
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('debería obtener menús por nivel', async () => {
    const expected = { status: 200, data: [{ men_id: '1', men_level: 2 }] };
    mockMenuService.getMenuParentByLevel.mockResolvedValue(expected);
    const result = await controller.getMenuParentByLevel(2);
    expect(result).toEqual(expected);
    expect(service.getMenuParentByLevel).toHaveBeenCalledWith(2);
  });
});
