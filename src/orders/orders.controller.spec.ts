import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findByCustomerAndLaboratory: jest.fn(),
    findByLaboratoryAndStatus: jest.fn(),
    countOrdersByStatusAndLaboratory: jest.fn(),
    countOrdersToday: jest.fn(),
    changeStatus: jest.fn(),
    countOrdersCancel: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    findOrderWithResults: jest.fn(),
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

  it('debería crear una orden', async () => {
    const dto: CreateOrderDto = {} as any;
    const expected = { status: 201, message: 'ok' };
    mockOrdersService.create.mockResolvedValue(expected);
    const result = await controller.create(dto);
    expect(result).toEqual(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debería buscar por cliente y laboratorio', async () => {
    const dto: FilterOrderDto = {} as any;
    const expected = { status: 200, data: [] };
    mockOrdersService.findByCustomerAndLaboratory.mockResolvedValue(expected);
    const result = await controller.findByCustomerAndLaboratory(dto);
    expect(result).toEqual(expected);
    expect(service.findByCustomerAndLaboratory).toHaveBeenCalledWith(dto);
  });

  it('debería buscar por laboratorio y estado', async () => {
    const dto: FilterOrderDto = {} as any;
    const expected = { status: 200, data: [] };
    mockOrdersService.findByLaboratoryAndStatus.mockResolvedValue(expected);
    const result = await controller.findByLaboratoryAndStatus(dto);
    expect(result).toEqual(expected);
    expect(service.findByLaboratoryAndStatus).toHaveBeenCalledWith(dto);
  });

  it('debería contar órdenes por estado y laboratorio', async () => {
    const dto: FilterOrderDto = {} as any;
    const expected = { status: 200, count: 5 };
    mockOrdersService.countOrdersByStatusAndLaboratory.mockResolvedValue(expected);
    const result = await controller.countOrdersByStatusAndLaboratory(dto);
    expect(result).toEqual(expected);
    expect(service.countOrdersByStatusAndLaboratory).toHaveBeenCalledWith(dto);
  });

  it('debería contar órdenes de hoy', async () => {
    const expected = { status: 200, count: 2 };
    mockOrdersService.countOrdersToday.mockResolvedValue(expected);
    const result = await controller.countOrdersToday('lab-uuid');
    expect(result).toEqual(expected);
    expect(service.countOrdersToday).toHaveBeenCalledWith('lab-uuid');
  });

  it('debería cambiar el estado de una orden', async () => {
    const dto: FilterOrderDto = {} as any;
    const expected = { status: 200, message: 'ok' };
    mockOrdersService.changeStatus.mockResolvedValue(expected);
    const result = await controller.changeStatus(dto);
    expect(result).toEqual(expected);
    expect(service.changeStatus).toHaveBeenCalledWith(dto);
  });

  it('debería contar órdenes canceladas', async () => {
    const expected = { status: 200, count: 1 };
    mockOrdersService.countOrdersCancel.mockResolvedValue(expected);
    const result = await controller.countOrdersCancel('lab-uuid');
    expect(result).toEqual(expected);
    expect(service.countOrdersCancel).toHaveBeenCalledWith('lab-uuid');
  });

  it('debería retornar una orden por id', async () => {
    const expected = { status: 200, data: { order_id: '1' } };
    mockOrdersService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne('order-uuid');
    expect(result).toEqual(expected);
    expect(service.findOne).toHaveBeenCalledWith('order-uuid');
  });

  it('debería eliminar una orden', async () => {
    const expected = { status: 200, message: 'deleted' };
    mockOrdersService.remove.mockResolvedValue(expected);
    const result = await controller.remove('order-uuid');
    expect(result).toEqual(expected);
    expect(service.remove).toHaveBeenCalledWith('order-uuid');
  });

  it('debería retornar una orden con resultados', async () => {
    const expected = { status: 200, data: { order_id: '1', results: [] } };
    mockOrdersService.findOrderWithResults.mockResolvedValue(expected);
    const result = await controller.findOrderWithResults('order-uuid');
    expect(result).toEqual(expected);
    expect(service.findOrderWithResults).toHaveBeenCalledWith('order-uuid');
  });
});
