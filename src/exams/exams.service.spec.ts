import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

describe('ExamsService', () => {
  let service: ExamsService;
  let examRepository: Repository<Exam>;
  let laboratoryRepository: Repository<Laboratory>;
  let allianceRepository: Repository<Alliance>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        {
          provide: getRepositoryToken(Exam),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            preload: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Laboratory),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Alliance),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
    examRepository = module.get(getRepositoryToken(Exam));
    laboratoryRepository = module.get(getRepositoryToken(Laboratory));
    allianceRepository = module.get(getRepositoryToken(Alliance));
  });

  describe('create', () => {
    it('debe crear un examen correctamente', async () => {
      const dto = { exa_name: 'Examen', exa_description: 'desc', exa_price: 10, laboratory: 'lab-id' };
      const lab = { lab_id: 'lab-id' } as Laboratory;
      const exam = { ...dto, laboratory: lab } as Exam;
      laboratoryRepository.create = jest.fn().mockReturnValue(lab);
      examRepository.create = jest.fn().mockReturnValue(exam);
      examRepository.save = jest.fn().mockResolvedValue(exam);
      const result = await service.create(dto as any);
      expect(result.status).toBe(201);
      expect(result.message).toContain('creado');
    });
  });

  describe('update', () => {
    it('debe actualizar un examen correctamente', async () => {
      const dto = { exa_name: 'Nuevo', laboratory: 'lab-id' };
      const lab = { lab_id: 'lab-id' } as Laboratory;
      const exam = { exa_id: 'exa-id', ...dto, laboratory: lab } as Exam;
      laboratoryRepository.create = jest.fn().mockReturnValue(lab);
      examRepository.preload = jest.fn().mockResolvedValue(exam);
      examRepository.save = jest.fn().mockResolvedValue(exam);
      const result = await service.update('exa-id', dto as any);
      expect(result.status).toBe(200);
      expect(result.message).toContain('actualizado');
    });
    it('debe lanzar error si preload retorna null', async () => {
      examRepository.preload = jest.fn().mockResolvedValue(null);
      await expect(service.update('id', {} as any)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('debe retornar un examen por id', async () => {
      const exam = { exa_id: 'exa-id' } as Exam;
      examRepository.findOne = jest.fn().mockResolvedValue(exam);
      const result = await service.findOne('exa-id');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(exam);
    });
    it('debe lanzar error si no existe el examen', async () => {
      examRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.findOne('no-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByLaboratory', () => {
    it('debe retornar exámenes por laboratorio', async () => {
      const exams = [{ exa_id: '1' }, { exa_id: '2' }] as Exam[];
      examRepository.find = jest.fn().mockResolvedValue(exams);
      const result = await service.findAllByLaboratory('lab-id');
      expect(result.status).toBe(200);
      expect(result.data).toEqual(exams);
    });
  });
});
