import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;

  const mockOrdersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByLaboratoryAndStatus: jest.fn(),
    changeStatus: jest.fn(),
    countOrdersToday: jest.fn(),
    sendEmailResults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();
    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debería retornar una orden por id dentro del laboratorio del usuario', async () => {
    const expected = { status: 200, data: { ord_id: '1' } };
    mockOrdersService.findOne.mockResolvedValue(expected);
    const result = await controller.findOne(user, 'order-uuid');
    expect(result).toEqual(expected);
    expect(mockOrdersService.findOne).toHaveBeenCalledWith(
      'order-uuid',
      'lab-a',
    );
  });

  it('debería enviar correo de resultados con el laboratorio del usuario', async () => {
    mockOrdersService.sendEmailResults.mockResolvedValue({ status: 200 });
    await controller.sendEmailResults(user, 'order-uuid');
    expect(mockOrdersService.sendEmailResults).toHaveBeenCalledWith(
      'order-uuid',
      'lab-a',
    );
  });

  it('completa el lab_id con el del usuario cuando el cliente no lo envía', async () => {
    await controller.findByLaboratoryAndStatus(user, {
      ord_status: 'PENDIENTE',
    });
    expect(mockOrdersService.findByLaboratoryAndStatus).toHaveBeenCalledWith({
      ord_status: 'PENDIENTE',
      lab_id: 'lab-a',
    });
  });

  it('rechaza con 404 un lab_id de otro laboratorio sin llamar al service', () => {
    expect(() =>
      controller.findByLaboratoryAndStatus(user, {
        lab_id: 'lab-b',
        ord_status: 'PENDIENTE',
      }),
    ).toThrow(NotFoundException);
    expect(() => controller.countOrdersToday(user, 'lab-b')).toThrow(
      NotFoundException,
    );
    expect(() => controller.create(user, { lab_id: 'lab-b' } as any)).toThrow(
      NotFoundException,
    );
    expect(mockOrdersService.findByLaboratoryAndStatus).not.toHaveBeenCalled();
    expect(mockOrdersService.create).not.toHaveBeenCalled();
  });

  it('cambia el estado validando el laboratorio del usuario', async () => {
    await controller.changeStatus(user, {
      ord_id: 'ord-1',
      ord_status: 'PROCESANDO',
    });
    expect(mockOrdersService.changeStatus).toHaveBeenCalledWith(
      { ord_id: 'ord-1', ord_status: 'PROCESANDO' },
      'lab-a',
    );
  });
});
