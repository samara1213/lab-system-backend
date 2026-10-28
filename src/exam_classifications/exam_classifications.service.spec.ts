import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExamClassificationsService } from './exam_classifications.service';
import { ExamClassification } from './entities/exam_classification.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

const queryBuilder = () => {
  const qb: any = {};
  for (const method of [
    'leftJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'groupBy',
  ])
    qb[method] = jest.fn(() => qb);
  qb.getMany = jest.fn();
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
};

const listQuery = queryBuilder();
const countQuery = queryBuilder();
const mockClassificationRepo = {
  createQueryBuilder: jest.fn(() => listQuery),
  create: jest.fn((data) => data),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockExamRepo = { createQueryBuilder: jest.fn(() => countQuery) };
const mockLabRepo = { exists: jest.fn() };
const mockExceptionService = {
  handleDBError: jest.fn((error) => {
    throw error;
  }),
};

// usuario de laboratorio y super administrador (rol del sistema)
const labUser = {
  use_id: 'u1',
  laboratory: { lab_id: 'lab-a' },
  role: { rol_is_system: false, rol_active: true, permissions: [] },
} as any;
const superAdmin = {
  use_id: 'admin',
  laboratory: { lab_id: 'lab-a' },
  role: { rol_is_system: true, rol_active: true, permissions: [] },
} as any;

describe('ExamClassificationsService', () => {
  let service: ExamClassificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamClassificationsService,
        {
          provide: getRepositoryToken(ExamClassification),
          useValue: mockClassificationRepo,
        },
        { provide: getRepositoryToken(Exam), useValue: mockExamRepo },
        { provide: getRepositoryToken(Laboratory), useValue: mockLabRepo },
        { provide: ExceptionService, useValue: mockExceptionService },
      ],
    }).compile();
    service = module.get(ExamClassificationsService);
  });

  describe('findAll', () => {
    it('un usuario de laboratorio ve las del sistema y las suyas; solo edita las suyas', async () => {
      listQuery.getMany.mockResolvedValue([
        { cla_id: 'g', cla_name: 'QUÍMICA', laboratory: null },
        {
          cla_id: 'l',
          cla_name: 'Propia',
          laboratory: { lab_id: 'lab-a', lab_name: 'Lab A', lab_nit: '9' },
        },
      ]);
      countQuery.getRawMany.mockResolvedValue([{ id: 'g', total: 3 }]);
      const result = await service.findAll(labUser);
      expect(listQuery.where).toHaveBeenCalledWith(
        '(cla.laboratory IS NULL OR laboratory.lab_id = :scopeLabId)',
        { scopeLabId: 'lab-a' },
      );
      expect(countQuery.andWhere).toHaveBeenCalledWith(
        'exam.laboratoryLabId = :scopeLabId',
        { scopeLabId: 'lab-a' },
      );
      expect(result.data).toEqual([
        expect.objectContaining({
          cla_id: 'g',
          exams_count: 3,
          editable: false,
        }),
        expect.objectContaining({
          cla_id: 'l',
          exams_count: 0,
          editable: true,
          laboratory: { lab_id: 'lab-a', lab_name: 'Lab A' },
        }),
      ]);
    });

    it('un usuario de laboratorio no consulta otro laboratorio', async () => {
      await expect(service.findAll(labUser, 'lab-b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('el super administrador ve todas si no indica laboratorio', async () => {
      listQuery.getMany.mockResolvedValue([]);
      await service.findAll(superAdmin);
      expect(listQuery.where).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('un usuario de laboratorio crea en su laboratorio', async () => {
      await service.create(labUser, { cla_name: ' Serología ' });
      expect(mockClassificationRepo.create).toHaveBeenCalledWith({
        cla_name: 'Serología',
        laboratory: { lab_id: 'lab-a' },
      });
    });

    it('un usuario de laboratorio no crea en otro laboratorio', async () => {
      await expect(
        service.create(labUser, { cla_name: 'X', laboratory: 'lab-b' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockClassificationRepo.save).not.toHaveBeenCalled();
    });

    it('el super administrador crea del sistema sin laboratorio', async () => {
      await service.create(superAdmin, { cla_name: 'Genética' });
      expect(mockClassificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ laboratory: null }),
      );
      expect(mockLabRepo.exists).not.toHaveBeenCalled();
    });

    it('el super administrador no crea en un laboratorio inexistente', async () => {
      mockLabRepo.exists.mockResolvedValue(false);
      await expect(
        service.create(superAdmin, { cla_name: 'X', laboratory: 'lab-x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('un usuario de laboratorio no modifica las del sistema (403)', async () => {
      mockClassificationRepo.findOne.mockResolvedValue({
        cla_id: 'g',
        laboratory: null,
      });
      await expect(
        service.update(labUser, 'g', { cla_name: 'X' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockClassificationRepo.update).not.toHaveBeenCalled();
    });

    it('las de otro laboratorio responden 404', async () => {
      mockClassificationRepo.findOne.mockResolvedValue({
        cla_id: 'l',
        laboratory: { lab_id: 'lab-b' },
      });
      await expect(
        service.update(labUser, 'l', { cla_active: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('modifica las de su laboratorio y el super administrador cualquiera', async () => {
      mockClassificationRepo.findOne.mockResolvedValue({
        cla_id: 'l',
        laboratory: { lab_id: 'lab-a' },
      });
      await service.update(labUser, 'l', { cla_name: ' Nueva ' });
      expect(mockClassificationRepo.update).toHaveBeenCalledWith(
        { cla_id: 'l' },
        { cla_name: 'Nueva' },
      );
      mockClassificationRepo.findOne.mockResolvedValue({
        cla_id: 'g',
        laboratory: null,
      });
      await expect(
        service.update(superAdmin, 'g', { cla_show_images: true }),
      ).resolves.toMatchObject({ status: 200 });
    });
  });
});
