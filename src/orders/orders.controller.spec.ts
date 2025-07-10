import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { FilterOrderDto } from './dto/filter-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    findOne: jest.fn(),
    sendEmailResults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();
    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería retornar una orden por id', async () => {
    const expected = { status: 200, data: { ord_id: '1' } };
    mockOrdersService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne('order-uuid');
    expect(result).toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('order-uuid');
  });

  it('debería enviar correo de resultados', async () => {
    const expected = { status: 200, message: 'Se ha enviado el correo con los resultados correctamente' };
    mockOrdersService.sendEmailResults.mockResolvedValue(expected);
    const result = await controller.sendEmailResults('order-uuid');
    expect(result).toEqual(expected);
    expect(service.sendEmailResults).toHaveBeenCalledWith('order-uuid');
  });
});
