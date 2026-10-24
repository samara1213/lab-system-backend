import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

describe('CustomersController', () => {
  let controller: CustomersController;
  const user = { laboratory: { lab_id: 'lab-a' } } as any;
  const mockCustomersService = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findOneCustomer: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: mockCustomersService }],
    }).compile();
    controller = module.get<CustomersController>(CustomersController);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('crea el paciente en el laboratorio del usuario', async () => {
    const dto = { cus_document_number: '0000000000', laboratory: 'lab-a' };
    await controller.create(user, dto as any);
    expect(mockCustomersService.create).toHaveBeenCalledWith('lab-a', dto);
  });

  it('busca un paciente forzando el laboratorio del usuario', async () => {
    await controller.findOneCustomer(user, { laboratory: 'lab-a', cus_document_number: '0000000000' });
    expect(mockCustomersService.findOneCustomer).toHaveBeenCalledWith({ laboratory: 'lab-a', cus_document_number: '0000000000' });
  });

  it('lista y actualiza dentro del laboratorio del usuario', async () => {
    await controller.findAll(user, 'lab-a');
    await controller.update(user, 'cus-1', { cus_first_name: 'X' } as any);
    expect(mockCustomersService.findAllByCompany).toHaveBeenCalledWith('lab-a');
    expect(mockCustomersService.update).toHaveBeenCalledWith('cus-1', 'lab-a', { cus_first_name: 'X' });
  });

  it('rechaza con 404 un laboratorio ajeno', () => {
    expect(() => controller.findAll(user, 'lab-b')).toThrow(NotFoundException);
    expect(() => controller.findOneCustomer(user, { laboratory: 'lab-b', cus_document_number: '1' })).toThrow(NotFoundException);
    expect(() => controller.update(user, 'cus-1', { laboratory: 'lab-b' } as any)).toThrow(NotFoundException);
    expect(mockCustomersService.update).not.toHaveBeenCalled();
  });
});
