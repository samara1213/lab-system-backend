import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: ExamsService;

  const mockExam = { exa_id: 'uuid', exa_name: 'Examen', exa_description: 'desc', exa_price: 10 };
  const mockExams = [mockExam];

  const examsServiceMock = {
    create: jest.fn().mockResolvedValue({ status: 201, message: 'El registro de examen se ha creado correctamente' }),
    update: jest.fn().mockResolvedValue({ status: 200, message: 'El registro de examen se ha actualizado correctamente' }),
    findOne: jest.fn().mockResolvedValue({ status: 200, data: mockExam }),
    findAllByLaboratory: jest.fn().mockResolvedValue({ status: 200, data: mockExams }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        { provide: ExamsService, useValue: examsServiceMock },
        { provide: ExceptionService, useValue: { handleDBError: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ExamsController>(ExamsController);
    service = module.get<ExamsService>(ExamsService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe delegar a ExamsService.create', async () => {
      const dto: CreateExamDto = { exa_name: 'Examen', exa_description: 'desc', exa_price: 10, laboratory: 'lab-id' } as any;
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result.status).toBe(201);
    });
  });

  describe('update', () => {
    it('debe delegar a ExamsService.update', async () => {
      const dto: UpdateExamDto = { exa_name: 'Nuevo' } as any;
      const result = await controller.update('uuid', dto);
      expect(service.update).toHaveBeenCalledWith('uuid', dto);
      expect(result.status).toBe(200);
    });
  });

  describe('findOne', () => {
    it('debe delegar a ExamsService.findOne', async () => {
      const result = await controller.findOne('uuid');
      expect(service.findOne).toHaveBeenCalledWith('uuid');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockExam);
    });
  });

  describe('findAllByCompany', () => {
    it('debe delegar a ExamsService.findAllByLaboratory', async () => {
      const result = await controller.findAllByCompany('lab-id');
      expect(service.findAllByLaboratory).toHaveBeenCalledWith('lab-id');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockExams);
    });
  });
});
