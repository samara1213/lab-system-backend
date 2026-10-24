import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsService } from './params_exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { Exam } from '../exams/entities/exam.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { NotFoundException } from '@nestjs/common';

describe('ParamsExamsService', () => {
  let service: ParamsExamsService;
  const mockParamsExamsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
  };
  const mockExamRepo = {
    create: jest.fn(),
    exists: jest.fn(),
  };
  // el servicio real de excepciones propaga las HttpException
  const mockExceptionService = { handleDBError: jest.fn((error) => { throw error; }) };

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
    mockExamRepo.exists.mockResolvedValue(true);
    mockExamRepo.create.mockReturnValue(exam);
    mockParamsExamsRepo.create.mockReturnValue(paramExam);
    mockParamsExamsRepo.save.mockResolvedValue(paramExam);
    const result = await service.create('lab-uuid', dto as any);
    expect(result.status).toBe(201);
    expect(mockExamRepo.exists).toHaveBeenCalledWith({ where: { exa_id: 'exa-uuid', laboratory: { lab_id: 'lab-uuid' } } });
    expect(mockExamRepo.create).toHaveBeenCalledWith({ exa_id: dto.exam });
    expect(mockParamsExamsRepo.create).toHaveBeenCalledWith({ ...dto, exam });
    expect(mockParamsExamsRepo.save).toHaveBeenCalledWith(paramExam);
  });

  it('no debería crear un parámetro en un examen de otro laboratorio', async () => {
    mockExamRepo.exists.mockResolvedValue(false);
    await expect(service.create('lab-uuid', { name: 'p', exam: 'exa-otro' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(mockParamsExamsRepo.save).not.toHaveBeenCalled();
  });

  it('debería actualizar un parámetro de examen', async () => {
    const dto = { name: 'nuevo', exam: 'exa-uuid' };
    const exam = { exa_id: 'exa-uuid' };
    const paramExam = { par_id: 'par-uuid', name: 'nuevo', exam };
    mockParamsExamsRepo.exists.mockResolvedValue(true);
    mockExamRepo.exists.mockResolvedValue(true);
    mockExamRepo.create.mockReturnValue(exam);
    mockParamsExamsRepo.preload.mockResolvedValue(paramExam);
    mockParamsExamsRepo.save.mockResolvedValue(paramExam);
    const result = await service.update('par-uuid', 'lab-uuid', dto as any);
    expect(result.status).toBe(200);
    expect(mockExamRepo.create).toHaveBeenCalledWith({ exa_id: dto.exam });
    expect(mockParamsExamsRepo.preload).toHaveBeenCalledWith({ par_id: 'par-uuid', name: 'nuevo', exam });
    expect(mockParamsExamsRepo.save).toHaveBeenCalledWith(paramExam);
  });

  it('no debería actualizar un parámetro de otro laboratorio', async () => {
    mockParamsExamsRepo.exists.mockResolvedValue(false);
    await expect(service.update('par-uuid', 'lab-uuid', { name: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(mockParamsExamsRepo.save).not.toHaveBeenCalled();
  });

  it('debería listar parámetros por id de examen dentro del laboratorio', async () => {
    const params = [{ par_id: '1' }];
    mockParamsExamsRepo.find.mockResolvedValue(params);
    const result = await service.findByExamId('exa-uuid', 'lab-uuid');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(params);
    expect(mockParamsExamsRepo.find).toHaveBeenCalledWith({ where: { exam: { exa_id: 'exa-uuid', laboratory: { lab_id: 'lab-uuid' } } } });
  });
});
