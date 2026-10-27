import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ResultsService } from './results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Result } from './entities/result.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { OrdersService } from '../orders/orders.service';
import { ParamsExam } from '../params_exams/entities/params_exam.entity';

describe('ResultsService', () => {
  let service: ResultsService;
  const mockManager = { exists: jest.fn() };
  const mockResultRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    manager: mockManager,
  };
  const mockOrdersService = {
    assertOrderInLaboratory: jest.fn(),
    updateStatus: jest.fn(),
  };
  // el servicio real de excepciones propaga las HttpException
  const mockExceptionService = {
    handleDBError: jest.fn((error) => {
      throw error;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        { provide: getRepositoryToken(Result), useValue: mockResultRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();
    service = module.get<ResultsService>(ResultsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { res_value: '10', order: 'ord', exam: 'exa', param: 'par' };

    it('debería crear un resultado y pasar la orden a PENDIENTE PDF', async () => {
      mockOrdersService.assertOrderInLaboratory.mockResolvedValue(undefined);
      mockManager.exists.mockResolvedValue(true);
      mockResultRepo.create.mockImplementation((data) => data);
      const result = await service.create('lab-a', dto as any);
      expect(result.status).toBe(201);
      expect(mockOrdersService.assertOrderInLaboratory).toHaveBeenCalledWith(
        'ord',
        'lab-a',
      );
      expect(mockManager.exists).toHaveBeenCalledWith(ParamsExam, {
        where: {
          par_id: 'par',
          exam: { exa_id: 'exa', laboratory: { lab_id: 'lab-a' } },
        },
      });
      expect(mockResultRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { ord_id: 'ord' },
          exam: { exa_id: 'exa' },
          param: { par_id: 'par' },
        }),
      );
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        'ord',
        'PENDIENTE PDF',
      );
    });

    it('no debería crear un resultado en una orden de otro laboratorio', async () => {
      mockOrdersService.assertOrderInLaboratory.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(service.create('lab-a', dto as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockResultRepo.save).not.toHaveBeenCalled();
    });

    it('no debería crear un resultado con un parámetro de otro examen o laboratorio', async () => {
      mockOrdersService.assertOrderInLaboratory.mockResolvedValue(undefined);
      mockManager.exists.mockResolvedValue(false);
      await expect(service.create('lab-a', dto as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockResultRepo.save).not.toHaveBeenCalled();
    });
  });

  it('debería retornar resultados por id de orden', async () => {
    const results = [{ res_id: '1' }];
    mockResultRepo.find.mockResolvedValue(results);
    const result = await service.findOne('ord', 'lab-a');
    expect(mockOrdersService.assertOrderInLaboratory).toHaveBeenCalledWith(
      'ord',
      'lab-a',
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual(results);
  });

  describe('update', () => {
    const current = {
      res_id: 'res',
      order: { ord_id: 'ord' },
      exam: { exa_id: 'exa' },
      param: { par_id: 'par' },
    };

    it('debería actualizar el valor conservando orden, examen y parámetro', async () => {
      mockResultRepo.findOne.mockResolvedValue(current);
      mockResultRepo.preload.mockImplementation(async (data) => data);
      const result = await service.update('res', 'lab-a', {
        res_value: '20',
      } as any);
      expect(result.status).toBe(200);
      expect(mockResultRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { res_id: 'res', order: { laboratory: { lab_id: 'lab-a' } } },
        }),
      );
      expect(mockResultRepo.preload).toHaveBeenCalledWith({
        res_id: 'res',
        res_value: '20',
        order: { ord_id: 'ord' },
        exam: { exa_id: 'exa' },
        param: { par_id: 'par' },
      });
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
        'ord',
        'PENDIENTE PDF',
      );
    });

    it('no debería actualizar un resultado de otro laboratorio', async () => {
      mockResultRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('res', 'lab-a', { res_value: '20' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockResultRepo.save).not.toHaveBeenCalled();
    });

    it('no debería mover un resultado a una orden de otro laboratorio', async () => {
      mockResultRepo.findOne.mockResolvedValue(current);
      mockOrdersService.assertOrderInLaboratory.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(
        service.update('res', 'lab-a', { order: 'ord-otro' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockResultRepo.save).not.toHaveBeenCalled();
    });
  });
});
