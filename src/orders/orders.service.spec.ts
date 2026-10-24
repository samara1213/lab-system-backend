import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailsService } from '../emails/emails.service';
import { StorageService } from '../storage/storage.service';
import { Customer } from '../customers/entities/customer.entity';
import { Exam } from '../exams/entities/exam.entity';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockManager = {
    exists: jest.fn(),
    count: jest.fn(),
  };
  const mockOrderRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
    update: jest.fn(),
    manager: mockManager,
  };
  // el servicio real de excepciones propaga las HttpException
  const mockExceptionService = { handleDBError: jest.fn((error) => { throw error; }) };
  const mockPdfService = { generateResult: jest.fn() };
  const mockEmailsService = { sendMailResults: jest.fn() };
  const mockStorageService = { getSignedUrl: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: EmailsService, useValue: mockEmailsService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { ord_total_value: 100, lab_id: 'lab-a', cus_id: 'cus-1', exa_ids: ['exa-1', 'exa-2', 'exa-1'] };

    it('debería crear la orden en el laboratorio del usuario', async () => {
      mockManager.exists.mockResolvedValue(true);
      mockManager.count.mockResolvedValue(2);
      mockOrderRepo.create.mockImplementation((data) => data);
      const result = await service.create('lab-a', dto as any);
      expect(result.status).toBe(201);
      expect(mockManager.exists).toHaveBeenCalledWith(Customer, { where: { cus_id: 'cus-1', laboratory: { lab_id: 'lab-a' } } });
      expect(mockManager.count).toHaveBeenCalledWith(Exam, expect.objectContaining({
        where: expect.objectContaining({ laboratory: { lab_id: 'lab-a' } }),
      }));
      // los exámenes repetidos se guardan una sola vez
      expect(mockOrderRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        laboratory: { lab_id: 'lab-a' },
        exams: [{ exa_id: 'exa-1' }, { exa_id: 'exa-2' }],
      }));
    });

    it('no debería crear la orden con un paciente de otro laboratorio', async () => {
      mockManager.exists.mockResolvedValue(false);
      await expect(service.create('lab-a', dto as any)).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('no debería crear la orden con exámenes de otro laboratorio', async () => {
      mockManager.exists.mockResolvedValue(true);
      mockManager.count.mockResolvedValue(1);
      await expect(service.create('lab-a', dto as any)).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('aislamiento por laboratorio', () => {
    it('findOne filtra por laboratorio y responde 404 si la orden es de otro', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('ord-1', 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { ord_id: 'ord-1', laboratory: { lab_id: 'lab-a' } },
      }));
    });

    it('remove no cancela una orden de otro laboratorio', async () => {
      mockOrderRepo.exists.mockResolvedValue(false);
      await expect(service.remove('ord-1', 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.save).not.toHaveBeenCalled();
    });

    it('changeStatus con laboratorio no cambia una orden de otro laboratorio', async () => {
      mockOrderRepo.exists.mockResolvedValue(false);
      await expect(service.changeStatus({ ord_id: 'ord-1', ord_status: 'CANCELADA' }, 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });

    it('changeStatus actualiza el estado de una orden propia', async () => {
      mockOrderRepo.exists.mockResolvedValue(true);
      const result = await service.changeStatus({ ord_id: 'ord-1', ord_status: 'PROCESANDO' }, 'lab-a');
      expect(mockOrderRepo.update).toHaveBeenCalledWith({ ord_id: 'ord-1' }, { ord_status: 'PROCESANDO' });
      expect(result.status).toBe(200);
    });

    it('sin id de orden responde 404 sin consultar (TypeORM ignoraría la condición)', async () => {
      await expect(service.changeStatus({ ord_status: 'X' }, 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.assertOrderInLaboratory(null, 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockOrderRepo.exists).not.toHaveBeenCalled();
      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });

    it('sendEmailResults no envía resultados de una orden de otro laboratorio', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.sendEmailResults('ord-1', 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(mockEmailsService.sendMailResults).not.toHaveBeenCalled();
    });
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
          cus_email: 'paciente@ejemplo.test',
        },
      };
      mockOrderRepo.findOne.mockResolvedValue(fakeOrder);
      const result = await service.getUrlResult('id123', 'lab-a');
      expect(result).toEqual({
        status: 200,
        data: {
          ord_pdf_url: 'url.pdf',
          fullName: 'Juan Carlos Pérez Gómez',
          email: 'paciente@ejemplo.test',
        },
      });
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith({
        where: { ord_id: 'id123', ord_status: 'FINALIZADA', laboratory: { lab_id: 'lab-a' } },
        relations: { customer: true },
        select: { ord_pdf_url: true, ord_id: true, customer: true },
      });
    });

    it('debería lanzar NotFoundException si no existe la orden', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.getUrlResult('id123', 'lab-a')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
