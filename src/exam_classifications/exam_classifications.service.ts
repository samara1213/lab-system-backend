import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamClassification } from './entities/exam_classification.entity';
import { CreateExamClassificationDto } from './dto/create-exam_classification.dto';
import { UpdateExamClassificationDto } from './dto/update-exam_classification.dto';
import { Exam } from '../exams/entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { User } from '../auth/entities/user.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { isSystemUser } from '../permissions/permissions.helper';
import {
  NOT_FOUND_MESSAGE,
  resolveLaboratoryId,
} from '../auth/helpers/laboratory-access.helper';

@Injectable()
export class ExamClassificationsService {
  constructor(
    @InjectRepository(ExamClassification)
    private readonly classificationRepository: Repository<ExamClassification>,

    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,

    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Clasificaciones que el usuario puede ver, con la cantidad de exámenes que las usan
   * y si las puede editar.
   * - Super administrador: todas (o las del sistema + las del laboratorio indicado).
   * - Demás: las del sistema + las de su laboratorio
   * @param actor usuario autenticado
   * @param labId laboratorio a consultar (solo super administrador)
   * @returns listado ordenado como se imprimen en el PDF
   */
  async findAll(actor: User, labId?: string) {
    try {
      const isSystem = isSystemUser(actor);
      const scopeLabId = isSystem ? labId : resolveLaboratoryId(actor, labId);

      const query = this.classificationRepository
        .createQueryBuilder('cla')
        .leftJoinAndSelect('cla.laboratory', 'laboratory')
        .orderBy('cla.cla_order', 'ASC')
        .addOrderBy('cla.cla_name', 'ASC');
      if (scopeLabId)
        query.where(
          '(cla.laboratory IS NULL OR laboratory.lab_id = :scopeLabId)',
          { scopeLabId },
        );
      const classifications = await query.getMany();

      // exámenes por clasificación (de los demás laboratorios no se cuentan)
      const countQuery = this.examRepository
        .createQueryBuilder('exam')
        .select('exam.classificationClaId', 'id')
        .addSelect('COUNT(*)::int', 'total')
        .where('exam.classificationClaId IS NOT NULL')
        .groupBy('exam.classificationClaId');
      if (scopeLabId)
        countQuery.andWhere('exam.laboratoryLabId = :scopeLabId', {
          scopeLabId,
        });
      const counts = new Map<string, number>(
        (await countQuery.getRawMany()).map((row) => [row.id, row.total]),
      );

      return {
        status: 200,
        data: classifications.map((cla) => ({
          ...cla,
          laboratory: cla.laboratory
            ? {
                lab_id: cla.laboratory.lab_id,
                lab_name: cla.laboratory.lab_name,
              }
            : null,
          exams_count: counts.get(cla.cla_id) ?? 0,
          editable: isSystem || Boolean(cla.laboratory),
        })),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Crea una clasificación: el super administrador la crea del sistema o del laboratorio
   * que indique; los demás, en su laboratorio
   * @param actor usuario autenticado
   * @param dto datos de la clasificación
   */
  async create(actor: User, dto: CreateExamClassificationDto) {
    try {
      const { laboratory: requestedLabId, ...data } = dto;
      let lab_id: string | null;
      if (isSystemUser(actor)) {
        lab_id = requestedLabId ?? null;
        if (
          lab_id &&
          !(await this.laboratoryRepository.exists({ where: { lab_id } }))
        )
          throw new NotFoundException(NOT_FOUND_MESSAGE);
      } else {
        lab_id = resolveLaboratoryId(actor, requestedLabId);
      }

      const classification = this.classificationRepository.create({
        ...data,
        cla_name: data.cla_name.trim(),
        laboratory: lab_id ? { lab_id } : null,
      });
      await this.classificationRepository.save(classification);

      return {
        status: 201,
        message: 'La clasificación se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Actualiza una clasificación. Las del sistema solo las edita el super administrador;
   * las de otro laboratorio responden como inexistentes
   * @param actor usuario autenticado
   * @param id id de la clasificación
   * @param dto datos a cambiar
   */
  async update(actor: User, id: string, dto: UpdateExamClassificationDto) {
    try {
      const classification = await this.classificationRepository.findOne({
        where: { cla_id: id },
        relations: { laboratory: true },
      });
      if (!classification) throw new NotFoundException(NOT_FOUND_MESSAGE);

      if (!isSystemUser(actor)) {
        const labId = resolveLaboratoryId(actor);
        if (!classification.laboratory)
          throw new ForbiddenException(
            'Las clasificaciones del sistema solo las modifica el super administrador',
          );
        if (classification.laboratory.lab_id !== labId)
          throw new NotFoundException(NOT_FOUND_MESSAGE);
      }

      await this.classificationRepository.update(
        { cla_id: id },
        {
          ...dto,
          ...(dto.cla_name !== undefined && { cla_name: dto.cla_name.trim() }),
        },
      );

      return {
        status: 200,
        message: 'La clasificación se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
