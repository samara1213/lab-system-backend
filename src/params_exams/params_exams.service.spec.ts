import { Test, TestingModule } from '@nestjs/testing';
import { ParamsExamsService } from './params_exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('ParamsExamsService', () => {
  let service: ParamsExamsService;
  let paramsExamsRepository: Repository<ParamsExam>;
  let examRepository: Repository<Exam>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParamsExamsService,
        {
          provide: getRepositoryToken(ParamsExam),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            preload: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ParamsExamsService>(ParamsExamsService);
    paramsExamsRepository = module.get(getRepositoryToken(ParamsExam));
    examRepository = module.get(getRepositoryToken(Exam));
  });

  describe('create', () => {
    it('debe crear un parámetro correctamente', async () => {
      const dto = {
        par_name: 'Parametro',
        par_default_value: '10',
        par_range: false,
        par_unit_extent: 'mg/dL',
        par_min_man: 1,
        par_max_man: 10,
        par_min_woman: 2,
        par_max_woman: 9,
        par_min_child: 0.5,
        par_max_child: 8,
        par_reference_value: '70-110 mg/dL', // Nuevo parámetro opcional
        exam: 'exam-uuid',
      };
      const exam = { exa_id: 'exam-uuid' } as Exam;
      const paramExam = { ...dto, exam } as ParamsExam;
      examRepository.create = jest.fn().mockReturnValue(exam);
      paramsExamsRepository.create = jest.fn().mockReturnValue(paramExam);
      paramsExamsRepository.save = jest.fn().mockResolvedValue(paramExam);
      const result = await service.create(dto as any);
      expect(result.status).toBe(201);
      expect(result.message).toContain('creado');
    });
  });

  describe('update', () => {
    it('debe actualizar un parámetro correctamente', async () => {
      const dto = {
        par_name: 'Parametro actualizado',
        par_default_value: '20',
        par_range: true,
        par_unit_extent: 'g/L',
        par_min_man: 2,
        par_max_man: 12,
        par_min_woman: 3,
        par_max_woman: 11,
        par_min_child: 1,
        par_max_child: 9,
        par_reference_value: '80-120 g/L', // Nuevo parámetro opcional
        exam: 'exam-uuid',
      };
      const exam = { exa_id: 'exam-uuid' } as Exam;
      const paramExam = { par_id: 'par-id', ...dto, exam } as ParamsExam;
      examRepository.create = jest.fn().mockReturnValue(exam);
      paramsExamsRepository.preload = jest.fn().mockResolvedValue(paramExam);
      paramsExamsRepository.save = jest.fn().mockResolvedValue(paramExam);
      const result = await service.update('par-id', dto as any);
      expect(result.status).toBe(200);
      expect(result.message).toContain('actualizado');
    });
    it('debe lanzar error si preload retorna null', async () => {
      paramsExamsRepository.preload = jest.fn().mockResolvedValue(null);
      await expect(service.update('par-id', {} as any)).rejects.toThrow(BadRequestException);
    });
  });
});
