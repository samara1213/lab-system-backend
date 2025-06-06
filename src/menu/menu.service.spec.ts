import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

const mockMenuRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  preload: jest.fn(),
};
const mockExceptionService = { handleDBError: jest.fn() };

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(Menu), useValue: mockMenuRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<MenuService>(MenuService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un menú', async () => {
    const dto = { men_name: 'Inicio', men_url: '/inicio', men_icon: 'home', men_level: 1 };
    const menu = { ...dto };
    mockMenuRepo.create.mockReturnValue(menu);
    mockMenuRepo.save.mockResolvedValue(menu);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockMenuRepo.create).toHaveBeenCalledWith(dto);
    expect(mockMenuRepo.save).toHaveBeenCalled();
  });

  it('debería retornar todos los menús', async () => {
    const menus = [{ men_id: '1' }, { men_id: '2' }];
    mockMenuRepo.find.mockResolvedValue(menus);
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toEqual(menus);
    expect(mockMenuRepo.find).toHaveBeenCalled();
  });

  it('debería actualizar un menú', async () => {
    const menu = { men_id: '1', men_name: 'Nuevo' };
    mockMenuRepo.preload.mockResolvedValueOnce(menu);
    mockMenuRepo.save.mockResolvedValueOnce(menu);
    const result = await service.update('1', { men_name: 'Nuevo' } as any);
    expect(result.status).toBe(200);
    expect(mockMenuRepo.preload).toHaveBeenCalledWith({ men_id: '1', men_name: 'Nuevo' });
    expect(mockMenuRepo.save).toHaveBeenCalled();
  });

  it('debería obtener menús por nivel', async () => {
    const menus = [{ men_id: '1', men_level: 2 }];
    mockMenuRepo.find.mockResolvedValueOnce(menus);
    const result = await service.getMenuParentByLevel(2);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(menus);
    expect(mockMenuRepo.find).toHaveBeenCalledWith({ where: { men_level: 2 } });
  });
});
