import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Repository } from 'typeorm';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { Alliance } from '../alliance/entities/alliance.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class ExamsService {
  private readonly logger = new Logger('CustomerService');

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,

    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,

    @InjectRepository(Alliance)
    private readonly allianceRepository: Repository<Alliance>,

    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Valida que el convenio exista en el laboratorio del usuario
   * @param ali_id id del convenio
   * @param lab_id id del laboratorio del usuario
   */
  private async assertAllianceInLaboratory(ali_id: string, lab_id: string) {
    // TypeORM ignora las condiciones undefined/null: sin id no se puede validar
    if (!ali_id || !lab_id)
      throw new NotFoundException('El convenio no existe');

    const exists = await this.allianceRepository.exists({
      where: { ali_id, laboratory: { lab_id } },
    });

    if (!exists) throw new NotFoundException('El convenio no existe');
  }

  /**
   * funcion que se encarga de realizar el guardado  de un examen en la base de datos
   * @param lab_id id del laboratorio del usuario
   * @param createExamDto  datos del examen
   */
  async create(lab_id: string, createExamDto: CreateExamDto) {
    try {
      // el examen siempre queda en el laboratorio del usuario
      const laboratory = this.laboratoryRepository.create({ lab_id });

      // verificamos si se envio un convenio
      let alliance: Alliance = null;
      if (createExamDto.alliance) {
        await this.assertAllianceInLaboratory(createExamDto.alliance, lab_id);

        // creamos la instancia del convenio
        alliance = this.allianceRepository.create({
          ali_id: createExamDto.alliance,
        });
      }

      // preparamos el objecto a guardar
      const exam = this.examRepository.create({
        ...createExamDto,
        laboratory,
        alliance,
      });

      // se guarda el registro en la base de datos
      await this.examRepository.save(exam);

      // regresamos la respuesta
      return {
        status: 201,
        message: 'El registro de examen se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * funcion que se encarga de realizar la actualizacion d elos datos de un examen
   * @param id  identoficacion de examen a buscar
   * @param lab_id id del laboratorio del usuario
   * @param updateExamDto  datos a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, lab_id: string, updateExamDto: UpdateExamDto) {
    try {
      // el examen debe pertenecer al laboratorio del usuario
      const examExists = await this.examRepository.exists({
        where: { exa_id: id, laboratory: { lab_id } },
      });

      if (!examExists)
        throw new NotFoundException('No se encuentra registro con este valor');

      // el laboratorio del examen no se cambia desde aqui
      const { laboratory, ...examData } = updateExamDto;

      // inicalizamos la variable de convenio
      let alliance: Alliance = null;

      // validamos si se envio y se retiro
      if (updateExamDto.alliance) {
        await this.assertAllianceInLaboratory(updateExamDto.alliance, lab_id);
        alliance = this.allianceRepository.create({
          ali_id: updateExamDto.alliance,
        });
      }

      // Preload busca y prepara la entidad para actualizar
      const exam = await this.examRepository.preload({
        exa_id: id,
        ...examData,
        alliance,
      });

      // Si no se encuentra el examen, lanzamos una excepción
      if (!exam) {
        throw new BadRequestException(
          'No se encuentra registro con este valor',
        );
      }

      // Guardamos la actualización en la base de datos
      await this.examRepository.save(exam);

      return {
        status: 200,
        message: 'El registro de examen se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Funcion que se encarga de buscar un examen por su id
   * @param id  indicativo del examen
   * @param lab_id id del laboratorio del usuario
   * @returns datos del examen
   */
  async findOne(id: string, lab_id: string) {
    try {
      // se busca el registro dentro del laboratorio del usuario
      const exam = await this.examRepository.findOne({
        where: { exa_id: id, laboratory: { lab_id } },
        relations: {
          laboratory: true,
          alliance: true,
          parameters: true,
        },
      });

      // validamos que el registro exista
      if (!exam)
        throw new NotFoundException('No se encuentra registro con este valor');

      // se regresa en el atributo data los datos del examen
      return {
        status: 200,
        data: exam,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * función que obtiene todos los exámenes de un laboratorio
   * @param laboratoryId id del laboratorio
   * @returns listado de exámenes
   */
  async findAllByLaboratory(laboratoryId: string) {
    try {
      const exams = await this.examRepository.find({
        where: { laboratory: { lab_id: laboratoryId } },
        relations: {
          alliance: true,
          parameters: true,
        },
      });

      return {
        status: 200,
        data: exams || [],
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
