import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('OrdersService', () => {
  let service: OrdersService;
  const mockOrderRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    preload: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockExceptionService = { handleDBError: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear una orden', async () => {
    const dto = { exa_ids: ['1'], lab_id: 'lab', cus_id: 'cus' };
    const order = { ...dto, exams: [{ exa_id: '1' }], laboratory: { lab_id: 'lab' }, customer: { cus_id: 'cus' } };
    mockOrderRepo.create.mockReturnValue(order);
    mockOrderRepo.save.mockResolvedValue(order);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockOrderRepo.create).toHaveBeenCalled();
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });

  it('debería retornar una orden por id', async () => {
    const order = { ord_id: '1' };
    mockOrderRepo.findOne.mockResolvedValue(order);
    const result = await service.findOne('1');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(order);
    expect(mockOrderRepo.findOne).toHaveBeenCalled();
  });

  it('debería buscar por cliente y laboratorio', async () => {
    const orders = [{ ord_id: '1' }];
    mockOrderRepo.find.mockResolvedValue(orders);
    const result = await service.findByCustomerAndLaboratory({ lab_id: 'lab', cus_id: 'cus' } as any);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(orders);
    expect(mockOrderRepo.find).toHaveBeenCalled();
  });

  it('debería buscar por laboratorio y estado', async () => {
    const orders = [{ ord_id: '1' }];
    mockOrderRepo.find.mockResolvedValue(orders);
    const result = await service.findByLaboratoryAndStatus({ lab_id: 'lab', ord_status: 'ACTIVA' } as any);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(orders);
    expect(mockOrderRepo.find).toHaveBeenCalled();
  });

  it('debería contar órdenes de hoy', async () => {
    const getCount = jest.fn().mockResolvedValue(3);
    const andWhere = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const queryBuilder = { where, andWhere, getCount };
    mockOrderRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    const result = await service.countOrdersToday('lab');
    expect(result.status).toBe(200);
    expect(result.data).toBe(3);
    expect(mockOrderRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('debería contar órdenes por estado y laboratorio', async () => {
    service.findByLaboratoryAndStatus = jest.fn().mockResolvedValue({ data: [1, 2, 3] });
    const result = await service.countOrdersByStatusAndLaboratory({ lab_id: 'lab', ord_status: 'ACTIVA' } as any);
    expect(result.status).toBe(200);
    expect(result.data).toBe(3);
  });

  it('debería cancelar una orden', async () => {
    const order = { ord_id: '1', ord_status: 'CANCELADA' };
    mockOrderRepo.preload.mockResolvedValue(order);
    mockOrderRepo.save.mockResolvedValue(order);
    const result = await service.remove('1');
    expect(result.status).toBe(200);
    expect(mockOrderRepo.preload).toHaveBeenCalledWith({ ord_id: '1', ord_status: 'CANCELADA' });
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });

  it('debería cambiar el estado de una orden', async () => {
    const order = { ord_id: '1', ord_status: 'FINALIZADA' };
    mockOrderRepo.preload.mockResolvedValue(order);
    mockOrderRepo.save.mockResolvedValue(order);
    const result = await service.changeStatus({ ord_id: '1', ord_status: 'FINALIZADA' } as any);
    expect(result.status).toBe(200);
    expect(mockOrderRepo.preload).toHaveBeenCalledWith({ ord_id: '1', ord_status: 'FINALIZADA' });
    expect(mockOrderRepo.save).toHaveBeenCalled();
  });

  it('debería contar órdenes canceladas', async () => {
    service.findByLaboratoryAndStatus = jest.fn().mockResolvedValue({ data: [1, 2] });
    const result = await service.countOrdersCancel('lab');
    expect(result.status).toBe(200);
    expect(result.data).toBe(2);
  });

  it('debería retornar una orden con resultados', async () => {
    const order = { ord_id: '1', results: [], exams: [], laboratory: {}, customer: {} };
    mockOrderRepo.findOne.mockResolvedValue(order);
    // Mock del helper
    jest.mock('./helpers/order-results.helper', () => ({ buildOrderResultsHierarchy: jest.fn().mockReturnValue({ ...order, hierarchy: true }) }));
    const result = await service.findOrderWithResults('1');
    expect(result.status).toBe(200);
    expect(result.data).toBeDefined();
    expect(mockOrderRepo.findOne).toHaveBeenCalled();
  });
});
