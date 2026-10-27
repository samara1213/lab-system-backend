import { Test, TestingModule } from '@nestjs/testing';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

describe('MenuController', () => {
  let controller: MenuController;

  const mockMenuService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    move: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [{ provide: MenuService, useValue: mockMenuService }],
    }).compile();

    controller = module.get<MenuController>(MenuController);
    jest.clearAllMocks();
  });

  it('delega cada operación en el servicio', async () => {
    await controller.create({ men_name: 'X' });
    expect(mockMenuService.create).toHaveBeenCalledWith({ men_name: 'X' });

    await controller.findAll();
    expect(mockMenuService.findAll).toHaveBeenCalled();

    await controller.update('m', { men_name: 'Y' });
    expect(mockMenuService.update).toHaveBeenCalledWith('m', { men_name: 'Y' });

    await controller.move('m', { direction: 'up' });
    expect(mockMenuService.move).toHaveBeenCalledWith('m', 'up');

    await controller.remove('m');
    expect(mockMenuService.remove).toHaveBeenCalledWith('m');
  });
});
