import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
import { Repository } from 'typeorm';

describe('MenuService', () => {
  let service: MenuService;
  let repository: Repository<Menu>;

  const mockRepository = {
    create: jest.fn(dto => dto),
    save: jest.fn(entity => Promise.resolve(entity)),
    find: jest.fn(() => Promise.resolve([])),
    preload: jest.fn(({ men_id, ...rest }) => Promise.resolve(men_id === 'exists' ? { men_id, ...rest } : null)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: getRepositoryToken(Menu),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    repository = module.get<Repository<Menu>>(getRepositoryToken(Menu));
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido el servicio', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un menú', async () => {
    const dto = { men_name: 'Test', men_level: 1 };
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debería retornar todos los menús', async () => {
    const result = await service.findAll();
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(mockRepository.find).toHaveBeenCalled();
  });

  it('debería actualizar un menú', async () => {
    mockRepository.preload.mockResolvedValueOnce({ men_id: 'exists', men_name: 'Updated' });
    mockRepository.save.mockResolvedValueOnce({ men_id: 'exists', men_name: 'Updated' });
    const result = await service.update('exists', { men_name: 'Updated' } as any);
    expect(result.status).toBe(200);
    expect(mockRepository.preload).toHaveBeenCalledWith({ men_id: 'exists', men_name: 'Updated' });
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debería obtener menús por nivel', async () => {
    mockRepository.find.mockResolvedValueOnce([{ men_level: 2 }]);
    const result = await service.getMenuParentByLevel(2);
    expect(result.status).toBe(200);
    expect(Array.isArray(result.data)).toBe(true);
    expect(mockRepository.find).toHaveBeenCalledWith({ where: { men_level: 2 } });
  });
});
