import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { BadRequestException } from '@nestjs/common';

const mockCustomerRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  preload: jest.fn(),
};
const mockExceptionService = { handleDBError: jest.fn() };

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

  it('debería crear un cliente correctamente', async () => {
    const dto = {
      cus_document_type: 'CC',
      cus_document_number: '123456',
      cus_first_lastname: 'Perez',
      cus_second_lastname: 'Gomez',
      cus_first_name: 'Juan',
      cus_second_name: 'Carlos',
      cus_address: 'Calle 1',
      cus_gender: 'M',
      cus_birthdate: new Date('1990-01-01'),
      cus_phone: '1234567',
      cus_email: 'test@mail.com',
      laboratory: 'lab-uuid',
    };
    const customer = { ...dto, laboratory: { lab_id: dto.laboratory } } as Customer;
    mockCustomerRepo.create.mockReturnValue(customer);
    mockCustomerRepo.save.mockResolvedValue(customer);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(result.message).toContain('creado');
  });

  it('debería retornar clientes por laboratorio', async () => {
    const customers = [{ cus_document_number: '123456' }] as Customer[];
    mockCustomerRepo.find.mockResolvedValue(customers);
    const result = await service.findAllByCompany('lab-uuid');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(customers);
  });

  it('debería retornar un cliente por laboratorio y documento', async () => {
    const customer = { cus_document_number: '123456', laboratory: { lab_id: 'lab-uuid' } } as Customer;
    mockCustomerRepo.findOne.mockResolvedValue(customer);
    const filter = { laboratory: 'lab-uuid', cus_document_number: '123456' };
    const result = await service.findOneCustomer(filter as any);
    expect(result.status).toBe(200);
    expect(result.data).toEqual(customer);
  });

  it('debería actualizar un cliente correctamente', async () => {
    const dto = { cus_first_name: 'Pedro', laboratory: 'lab-uuid' } as any;
    const customer = { cus_id: 'cus-uuid', ...dto, laboratory: { lab_id: dto.laboratory } } as Customer;
    mockCustomerRepo.preload.mockResolvedValue(customer);
    mockCustomerRepo.save.mockResolvedValue(customer);
    const result = await service.update('cus-uuid', dto);
    expect(result.status).toBe(200);
    expect(result.message).toContain('actualizó');
  });

 
});
