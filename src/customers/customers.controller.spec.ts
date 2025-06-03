import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomerDto } from './dto/filter-customer.dto';


describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const createDto: CreateCustomerDto = {
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
  const updateDto: UpdateCustomerDto = {
    cus_first_name: 'Pedro',
    laboratory: 'lab-uuid',
  } as any;
  const filterDto: FilterCustomerDto = {
    laboratory: 'lab-uuid',
    cus_document_number: '123456',
  };

  const customersServiceMock = {
    create: jest.fn().mockResolvedValue({ status: 201, message: 'El cliente se ha creado correctamente' }),
    findAllByCompany: jest.fn().mockResolvedValue({ data: [{ cus_document_number: '123456' }] }),
    findOneCustomer: jest.fn().mockResolvedValue({ status: 200, data: { cus_document_number: '123456' } }),
    update: jest.fn().mockResolvedValue({ status: 200, message: 'Se actualizó el cliente correctamente' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        { provide: CustomersService, useValue: customersServiceMock },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar a CustomersService.create', async () => {
      const result = await controller.create(createDto);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result.status).toBe(201);
    });
  });

  describe('findAll', () => {
    it('debe delegar a CustomersService.findAllByCompany', async () => {
      const result = await controller.findAll('lab-uuid');
      expect(service.findAllByCompany).toHaveBeenCalledWith('lab-uuid');
      expect(result.data).toBeDefined();
    });
  });

  describe('findOneCustomer', () => {
    it('debe delegar a CustomersService.findOneCustomer', async () => {
      const result = await controller.findOneCustomer(filterDto);
      expect(service.findOneCustomer).toHaveBeenCalledWith(filterDto);
      expect(result.status).toBe(200);
      expect(result.data.cus_document_number).toBe('123456');
    });
  });

  describe('update', () => {
    it('debe delegar a CustomersService.update', async () => {
      const result = await controller.update('cus-uuid', updateDto);
      expect(service.update).toHaveBeenCalledWith('cus-uuid', updateDto);
      expect(result.status).toBe(200);
    });
  });
});
