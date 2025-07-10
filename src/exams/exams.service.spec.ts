import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { BadRequestException } from '@nestjs/common';

const mockExamRepo = {
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};
const mockLabRepo = {
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockAllianceRepo = {
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockExceptionService = { handleDBError: jest.fn() };

describe('ExamsService', () => {
  let service: ExamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: getRepositoryToken(Exam), useValue: mockExamRepo },
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: getRepositoryToken(Alliance), useValue: mockAllianceRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get<ExamsService>(ExamsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería crear un examen correctamente', async () => {
    const dto = { exa_name: 'Examen', exa_description: 'desc', exa_price: 10, laboratory: 'lab-id' };
    const lab = { lab_id: 'lab-id' };
    const exam = { ...dto, laboratory: lab };
    mockLabRepo.create.mockReturnValue(lab);
    mockExamRepo.create.mockReturnValue(exam);
    mockExamRepo.save.mockResolvedValue(exam);
    const result = await service.create(dto as any);
    expect(result.status).toBe(201);
    expect(result.message).toContain('creado');
  });

  it('debería actualizar un examen correctamente', async () => {
    const dto = { exa_name: 'Nuevo', laboratory: 'lab-id' };
    const lab = { lab_id: 'lab-id' };
    const exam = { exa_id: 'exa-id', ...dto, laboratory: lab };
    mockLabRepo.create.mockReturnValue(lab);
    mockExamRepo.preload.mockResolvedValue(exam);
    mockExamRepo.save.mockResolvedValue(exam);
    const result = await service.update('exa-id', dto as any);
    expect(result.status).toBe(200);
    expect(result.message).toContain('actualizado');
  });


  it('debería retornar un examen por id', async () => {
    const exam = { exa_id: 'exa-id' };
    mockExamRepo.findOne.mockResolvedValue(exam);
    const result = await service.findOne('exa-id');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(exam);
  });

  it('debería retornar exámenes por laboratorio', async () => {
    const exams = [{ exa_id: '1' }, { exa_id: '2' }];
    mockExamRepo.find.mockResolvedValue(exams);
    const result = await service.findAllByLaboratory('lab-id');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(exams);
  });
});
