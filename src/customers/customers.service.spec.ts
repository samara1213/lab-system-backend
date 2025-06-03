import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: Repository<Customer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            preload: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get(getRepositoryToken(Customer));
  });

  describe('create', () => {
    it('debe crear un cliente correctamente', async () => {
      const dto: CreateCustomerDto = {
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
      customerRepository.create = jest.fn().mockReturnValue(customer);
      customerRepository.save = jest.fn().mockResolvedValue(customer);
      const result = await service.create(dto);
      expect(result.status).toBe(201);
      expect(result.message).toContain('creado');
    });
  });

  describe('findAllByCompany', () => {
    it('debe retornar clientes por laboratorio', async () => {
      const customers = [{ cus_document_number: '123456' }] as Customer[];
      customerRepository.find = jest.fn().mockResolvedValue(customers);
      const result = await service.findAllByCompany('lab-uuid');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(customers);
    });
  });

  describe('findOneCustomer', () => {
    it('debe retornar un cliente por laboratorio y documento', async () => {
      const customer = { cus_document_number: '123456', laboratory: { lab_id: 'lab-uuid' } } as Customer;
      customerRepository.findOne = jest.fn().mockResolvedValue(customer);
      const filter: FilterCustomerDto = { laboratory: 'lab-uuid', cus_document_number: '123456' };
      const result = await service.findOneCustomer(filter);
      expect(result.status).toBe(200);
      expect(result.data).toEqual(customer);
    });
    it('debe lanzar error si no existe el cliente', async () => {
      customerRepository.findOne = jest.fn().mockResolvedValue(null);
      const filter: FilterCustomerDto = { laboratory: 'lab-uuid', cus_document_number: 'no-existe' };
      await expect(service.findOneCustomer(filter)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('debe actualizar un cliente correctamente', async () => {
      const dto: UpdateCustomerDto = { cus_first_name: 'Pedro', laboratory: 'lab-uuid' } as any;
      const customer = { cus_id: 'cus-uuid', ...dto, laboratory: { lab_id: dto.laboratory } } as Customer;
      customerRepository.preload = jest.fn().mockResolvedValue(customer);
      customerRepository.save = jest.fn().mockResolvedValue(customer);
      const result = await service.update('cus-uuid', dto);
      expect(result.status).toBe(200);
      expect(result.message).toContain('actualizó');
    });
    it('debe lanzar error si no existe el cliente', async () => {
      customerRepository.preload = jest.fn().mockResolvedValue(null);
      await expect(service.update('cus-uuid', {} as any)).rejects.toThrow(BadRequestException);
    });
  });
});
