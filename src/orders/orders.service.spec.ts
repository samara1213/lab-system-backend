import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { PdfService } from '../pdf/pdf.service';
import { Repository } from 'typeorm';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: Repository<Order>;

  const mockOrderRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    create: jest.fn(),
  };
  const mockExceptionService = { handleDBError: jest.fn() };
  const mockPdfService = { generateResult: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getUrlResult', () => {
    it('debería retornar los datos de la orden finalizada', async () => {
      const fakeOrder = {
        ord_pdf_url: 'url.pdf',
        customer: {
          cus_first_name: 'Juan',
          cus_second_name: 'Carlos',
          cus_first_lastname: 'Pérez',
          cus_second_lastname: 'Gómez',
          cus_email: 'juan@mail.com',
        },
      };
      mockOrderRepo.findOne.mockResolvedValue(fakeOrder);
      const result = await service.getUrlResult('id123');
      expect(result).toEqual({
        status: 200,
        data: {
          ord_pdf_url: 'url.pdf',
          fullName: 'Juan Carlos Pérez Gómez',
          email: 'juan@mail.com',
        },
      });
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith({
        where: { ord_id: 'id123', ord_status: 'FINALIZADA' },
        relations: ['customer'],
        select: ['ord_pdf_url', 'ord_id', 'customer'],
      });
    });

    it('debería lanzar NotFoundException si no existe la orden', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.getUrlResult('id123')).rejects.toThrow();
    });
  });
});
