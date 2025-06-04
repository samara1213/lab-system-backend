import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

const mockOrder = { ord_id: 'uuid', ord_status: 'PENDIENTE' };
const mockResponse = { status: 200, data: [mockOrder] };

const mockOrdersService = {
  create: jest.fn().mockResolvedValue({ status: 201, message: 'La orden de laboratorio se ha creado correctamente' }),
  findByCustomerAndLaboratory: jest.fn().mockResolvedValue(mockResponse),
  findByLaboratoryAndStatus: jest.fn().mockResolvedValue(mockResponse),
  countOrdersByStatusAndLaboratory: jest.fn().mockResolvedValue({ status: 200, data: 2 }),
  countOrdersToday: jest.fn().mockResolvedValue({ status: 200, data: 1 }),
  changeStatus: jest.fn().mockResolvedValue({ status: 200, message: 'La orden de laboratorio se ha actualizado correctamente' }),
  countOrdersCancel: jest.fn().mockResolvedValue({ status: 200, data: 1 }),
  findOne: jest.fn().mockResolvedValue({ status: 200, data: mockOrder }),
  remove: jest.fn().mockResolvedValue({ status: 200, message: 'La orden de laboratorio se ha cancelado correctamente' }),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();
    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe crear una orden', async () => {
    const dto: CreateOrderDto = { ord_total_value: 100, lab_id: 'uuid', cus_id: 'uuid', exa_ids: [] } as any;
    const result = await controller.create(dto);
    expect(result).toEqual({ status: 201, message: expect.any(String) });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('debe buscar ordenes por cliente y laboratorio', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', cus_id: 'uuid' };
    const result = await controller.findByCustomerAndLaboratory(dto);
    expect(result).toEqual(mockResponse);
    expect(service.findByCustomerAndLaboratory).toHaveBeenCalledWith(dto);
  });

  it('debe buscar ordenes por laboratorio y estado', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', ord_status: 'PENDIENTE' };
    const result = await controller.findByLaboratoryAndStatus(dto);
    expect(result).toEqual(mockResponse);
    expect(service.findByLaboratoryAndStatus).toHaveBeenCalledWith(dto);
  });

  it('debe contar ordenes por estado y laboratorio', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', ord_status: 'PENDIENTE' };
    const result = await controller.countOrdersByStatusAndLaboratory(dto);
    expect(result).toEqual({ status: 200, data: 2 });
    expect(service.countOrdersByStatusAndLaboratory).toHaveBeenCalledWith(dto);
  });

  it('debe contar ordenes de hoy', async () => {
    const result = await controller.countOrdersToday('uuid');
    expect(result).toEqual({ status: 200, data: 1 });
    expect(service.countOrdersToday).toHaveBeenCalledWith('uuid');
  });

  it('debe cambiar el estado de una orden', async () => {
    const dto: FilterOrderDto = { ord_id: 'uuid', ord_status: 'CANCELADA' };
    const result = await controller.changeStatus(dto);
    expect(result).toEqual({ status: 200, message: expect.any(String) });
    expect(service.changeStatus).toHaveBeenCalledWith(dto);
  });

  it('debe contar ordenes canceladas', async () => {
    const result = await controller.countOrdersCancel('uuid');
    expect(result).toEqual({ status: 200, data: 1 });
    expect(service.countOrdersCancel).toHaveBeenCalledWith('uuid');
  });

  it('debe buscar una orden por id', async () => {
    const result = await controller.findOne('uuid');
    expect(result).toEqual({ status: 200, data: mockOrder });
    expect(service.findOne).toHaveBeenCalledWith('uuid');
  });

  it('debe cancelar una orden', async () => {
    const result = await controller.remove('uuid');
    expect(result).toEqual({ status: 200, message: expect.any(String) });
    expect(service.remove).toHaveBeenCalledWith('uuid');
  });
});
