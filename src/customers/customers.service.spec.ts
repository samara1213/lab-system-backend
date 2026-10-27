import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { NotFoundException } from '@nestjs/common';

const mockCustomerRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  preload: jest.fn(),
  exists: jest.fn(),
};
// el servicio real de excepciones propaga las HttpException
const mockExceptionService = {
  handleDBError: jest.fn((error) => {
    throw error;
  }),
};

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: mockCustomerRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un cliente en el laboratorio del usuario', async () => {
    const dto = {
      cus_document_type: 'CC',
      cus_document_number: '0000000000',
      cus_first_lastname: 'Perez',
      cus_second_lastname: 'Gomez',
      cus_first_name: 'Juan',
      cus_second_name: 'Carlos',
      cus_address: 'Calle 1',
      cus_gender: 'M',
      cus_birthdate: new Date('1990-01-01'),
      cus_phone: '1234567',
      cus_email: 'paciente@ejemplo.test',
      laboratory: 'lab-uuid',
    };
    const customer = { ...dto, laboratory: { lab_id: 'lab-uuid' } } as Customer;
    mockCustomerRepo.create.mockReturnValue(customer);
    mockCustomerRepo.save.mockResolvedValue(customer);
    const result = await service.create('lab-uuid', dto as any);
    expect(mockCustomerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ laboratory: { lab_id: 'lab-uuid' } }),
    );
    expect(result.status).toBe(201);
    expect(result.message).toContain('creado');
  });

  it('debería retornar clientes por laboratorio', async () => {
    const customers = [{ cus_document_number: '0000000000' }] as Customer[];
    mockCustomerRepo.find.mockResolvedValue(customers);
    const result = await service.findAllByCompany('lab-uuid');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(customers);
  });

  it('debería retornar un cliente por laboratorio y documento', async () => {
    const customer = {
      cus_document_number: '0000000000',
      laboratory: { lab_id: 'lab-uuid' },
    } as Customer;
    mockCustomerRepo.findOne.mockResolvedValue(customer);
    const filter = {
      laboratory: 'lab-uuid',
      cus_document_number: '0000000000',
    };
    const result = await service.findOneCustomer(filter as any);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(customer);
  });

  it('debería actualizar un cliente sin cambiarle el laboratorio', async () => {
    const dto = { cus_first_name: 'Pedro', laboratory: 'lab-uuid' } as any;
    const customer = {
      cus_id: 'cus-uuid',
      cus_first_name: 'Pedro',
    } as Customer;
    mockCustomerRepo.exists.mockResolvedValue(true);
    mockCustomerRepo.preload.mockResolvedValue(customer);
    mockCustomerRepo.save.mockResolvedValue(customer);
    const result = await service.update('cus-uuid', 'lab-uuid', dto);
    expect(mockCustomerRepo.preload).toHaveBeenCalledWith({
      cus_id: 'cus-uuid',
      cus_first_name: 'Pedro',
    });
    expect(result.status).toBe(200);
    expect(result.message).toContain('actualizó');
  });

  it('no debería actualizar un cliente de otro laboratorio', async () => {
    mockCustomerRepo.exists.mockResolvedValue(false);
    await expect(
      service.update('cus-uuid', 'lab-uuid', { cus_first_name: 'X' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockCustomerRepo.save).not.toHaveBeenCalled();
  });
});
