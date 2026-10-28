import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ExamClassification } from '../exam_classifications/entities/exam_classification.entity';

const mockExamRepo = {
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  exists: jest.fn(),
};
const mockLabRepo = {
  create: jest.fn(),
  findOne: jest.fn(),
};
const mockAllianceRepo = {
  create: jest.fn(),
  findOne: jest.fn(),
  exists: jest.fn(),
};
const mockClassificationRepo = {
  create: jest.fn((data) => data),
  exists: jest.fn(),
};
// el servicio real de excepciones propaga las HttpException
const mockExceptionService = {
  handleDBError: jest.fn((error) => {
    throw error;
  }),
};

describe('ExamsService', () => {
  let service: ExamsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: getRepositoryToken(Exam), useValue: mockExamRepo },
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: getRepositoryToken(Alliance), useValue: mockAllianceRepo },
        {
          provide: getRepositoryToken(ExamClassification),
          useValue: mockClassificationRepo,
        },
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

  it('debería crear un examen en el laboratorio del usuario', async () => {
    const dto = {
      exa_name: 'Examen',
      exa_description: 'desc',
      exa_price: 10,
      laboratory: 'lab-id',
    };
    const lab = { lab_id: 'lab-id' };
    const exam = { ...dto, laboratory: lab };
    mockLabRepo.create.mockReturnValue(lab);
    mockExamRepo.create.mockReturnValue(exam);
    mockExamRepo.save.mockResolvedValue(exam);
    const result = await service.create('lab-id', dto as any);
    expect(mockLabRepo.create).toHaveBeenCalledWith({ lab_id: 'lab-id' });
    expect(result.status).toBe(201);
    expect(result.message).toContain('creado');
  });

  it('no debería crear un examen con un convenio de otro laboratorio', async () => {
    mockAllianceRepo.exists.mockResolvedValue(false);
    const dto = { exa_name: 'Examen', exa_price: 10, alliance: 'ali-otro-lab' };
    await expect(service.create('lab-id', dto as any)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockExamRepo.save).not.toHaveBeenCalled();
  });

  it('debería actualizar un examen correctamente', async () => {
    const dto = { exa_name: 'Nuevo', laboratory: 'lab-id' };
    const exam = { exa_id: 'exa-id', exa_name: 'Nuevo' };
    mockExamRepo.exists.mockResolvedValue(true);
    mockExamRepo.preload.mockResolvedValue(exam);
    mockExamRepo.save.mockResolvedValue(exam);
    const result = await service.update('exa-id', 'lab-id', dto as any);
    // el laboratorio enviado no se aplica en la actualización
    expect(mockExamRepo.preload).toHaveBeenCalledWith({
      exa_id: 'exa-id',
      exa_name: 'Nuevo',
      alliance: null,
    });
    expect(result.status).toBe(200);
    expect(result.message).toContain('actualizado');
  });

  it('no debería actualizar un examen de otro laboratorio', async () => {
    mockExamRepo.exists.mockResolvedValue(false);
    await expect(
      service.update('exa-id', 'lab-id', { exa_name: 'X' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockExamRepo.save).not.toHaveBeenCalled();
  });

  it('debería retornar un examen por id dentro del laboratorio', async () => {
    const exam = { exa_id: 'exa-id' };
    mockExamRepo.findOne.mockResolvedValue(exam);
    const result = await service.findOne('exa-id', 'lab-id');
    expect(mockExamRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { exa_id: 'exa-id', laboratory: { lab_id: 'lab-id' } },
      }),
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual(exam);
  });

  it('crea el examen con una clasificación del sistema o de su laboratorio', async () => {
    mockClassificationRepo.exists.mockResolvedValue(true);
    mockExamRepo.create.mockImplementation((data) => data);
    await service.create('lab-id', {
      exa_name: 'Examen',
      exa_price: 10,
      classification: 'cla-1',
    } as any);
    expect(mockClassificationRepo.exists).toHaveBeenCalledWith({
      where: [
        { cla_id: 'cla-1', cla_active: true, laboratory: IsNull() },
        { cla_id: 'cla-1', cla_active: true, laboratory: { lab_id: 'lab-id' } },
      ],
    });
    expect(mockExamRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ classification: { cla_id: 'cla-1' } }),
    );
  });

  it('no usa una clasificación de otro laboratorio o inactiva', async () => {
    mockClassificationRepo.exists.mockResolvedValue(false);
    await expect(
      service.create('lab-id', {
        exa_name: 'Examen',
        exa_price: 10,
        classification: 'cla-otro-lab',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockExamRepo.save).not.toHaveBeenCalled();
  });

  it('al actualizar, null quita la clasificación y sin el campo no se cambia', async () => {
    mockExamRepo.exists.mockResolvedValue(true);
    mockExamRepo.preload.mockResolvedValue({ exa_id: 'exa-id' });
    await service.update('exa-id', 'lab-id', { classification: null } as any);
    expect(mockExamRepo.preload).toHaveBeenLastCalledWith(
      expect.objectContaining({ classification: null }),
    );
    await service.update('exa-id', 'lab-id', { exa_name: 'X' } as any);
    expect(mockExamRepo.preload.mock.lastCall[0]).not.toHaveProperty(
      'classification',
    );
    expect(mockClassificationRepo.exists).not.toHaveBeenCalled();
  });

  it('debería retornar exámenes por laboratorio', async () => {
    const exams = [{ exa_id: '1' }, { exa_id: '2' }];
    mockExamRepo.find.mockResolvedValue(exams);
    const result = await service.findAllByLaboratory('lab-id');
    expect(result.status).toBe(200);
    expect(result.data).toEqual(exams);
  });
});
