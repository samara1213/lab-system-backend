import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: Repository<Order>;

  const mockOrder = { ord_id: 'uuid', ord_status: 'PENDIENTE' };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockOrder),
    save: jest.fn().mockResolvedValue(mockOrder),
    findOne: jest.fn().mockResolvedValue(mockOrder),
    find: jest.fn().mockResolvedValue([mockOrder]),
    count: jest.fn().mockResolvedValue(2),
    preload: jest.fn().mockResolvedValue(mockOrder),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    })),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repo = module.get(getRepositoryToken(Order));
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una orden', async () => {
    const dto: CreateOrderDto = { ord_total_value: 100, lab_id: 'uuid', cus_id: 'uuid', exa_ids: [] } as any;
    const result = await service.create(dto);
    expect(result).toHaveProperty('status', 201);
    expect(repo.save).toHaveBeenCalled();
  });

  it('debe buscar una orden por id', async () => {
    const result = await service.findOne('uuid');
    expect(result).toHaveProperty('status', 200);
    expect(repo.findOne).toHaveBeenCalled();
  });

  it('debe buscar ordenes por cliente y laboratorio', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', cus_id: 'uuid' };
    const result = await service.findByCustomerAndLaboratory(dto);
    expect(result).toHaveProperty('status', 200);
    expect(repo.find).toHaveBeenCalled();
  });

  it('debe buscar ordenes por laboratorio y estado', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', ord_status: 'PENDIENTE' };
    const result = await service.findByLaboratoryAndStatus(dto);
    expect(result).toHaveProperty('status', 200);
    expect(repo.find).toHaveBeenCalled();
  });

  it('debe contar ordenes por estado y laboratorio', async () => {
    const dto: FilterOrderDto = { lab_id: 'uuid', ord_status: 'PENDIENTE' };
    const result = await service.countOrdersByStatusAndLaboratory(dto);
    expect(result).toHaveProperty('status', 200);
    expect(result.data).toBeGreaterThanOrEqual(0);
    expect(repo.find).toHaveBeenCalled();
  });

  it('debe contar ordenes de hoy', async () => {
    const result = await service.countOrdersToday('uuid');
    expect(result).toHaveProperty('status', 200);
    expect(result.data).toBeGreaterThanOrEqual(0);
    expect(repo.createQueryBuilder).toHaveBeenCalled();
  });

  it('debe cambiar el estado de una orden', async () => {
    const dto: FilterOrderDto = { ord_id: 'uuid', ord_status: 'CANCELADA' };
    const result = await service.changeStatus(dto);
    expect(result).toHaveProperty('status', 200);
    expect(repo.preload).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('debe cancelar una orden', async () => {
    const result = await service.remove('uuid');
    expect(result).toHaveProperty('status', 200);
    expect(repo.preload).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });
});
