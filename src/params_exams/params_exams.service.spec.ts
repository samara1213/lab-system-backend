import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsService } from './params_exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { Exam } from '../exams/entities/exam.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

describe('ParamsExamsService', () => {
  let service: ParamsExamsService;
  const mockParamsExamsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    find: jest.fn(),
  };
  const mockExamRepo = {
    create: jest.fn(),
  };
  const mockExceptionService = { handleDBError: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParamsExamsService,
        { provide: getRepositoryToken(ParamsExam), useValue: mockParamsExamsRepo },
        { provide: getRepositoryToken(Exam), useValue: mockExamRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<ParamsExamsService>(ParamsExamsService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un parámetro de examen', async () => {
    const dto = { name: 'param', exam: 'exa-uuid' };
    const exam = { exa_id: 'exa-uuid' };
    const paramExam = { ...dto, exam };
    mockExamRepo.create.mockReturnValue(exam);
    mockParamsExamsRepo.create.mockReturnValue(paramExam);
    mockParamsExamsRepo.save.mockResolvedValue(paramExam);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(mockExamRepo.create).toHaveBeenCalledWith({ exa_id: dto.exam });
    expect(mockParamsExamsRepo.create).toHaveBeenCalledWith({ ...dto, exam });
    expect(mockParamsExamsRepo.save).toHaveBeenCalledWith(paramExam);
  });

  it('debería actualizar un parámetro de examen', async () => {
    const dto = { name: 'nuevo', exam: 'exa-uuid' };
    const exam = { exa_id: 'exa-uuid' };
    const paramExam = { par_id: 'par-uuid', ...dto, exam };
    mockExamRepo.create.mockReturnValue(exam);
    mockParamsExamsRepo.preload.mockResolvedValue(paramExam);
    mockParamsExamsRepo.save.mockResolvedValue(paramExam);
    const result = await service.update('par-uuid', dto as any);
    expect(result.status).toBe(200);
    expect(mockExamRepo.create).toHaveBeenCalledWith({ exa_id: dto.exam });
    expect(mockParamsExamsRepo.preload).toHaveBeenCalledWith({ par_id: 'par-uuid', ...dto, exam });
    expect(mockParamsExamsRepo.save).toHaveBeenCalledWith(paramExam);
  });

  it('debería listar parámetros por id de examen', async () => {
    const params = [{ par_id: '1' }];
    mockParamsExamsRepo.find.mockResolvedValue(params);
    const result = await service.findByExamId('exa-uuid');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(params);
    expect(mockParamsExamsRepo.find).toHaveBeenCalledWith({ where: { exam: { exa_id: 'exa-uuid' } } });
  });
});
