import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Exam } from '../exams/entities/exam.entity';
import { stat } from 'fs';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class ParamsExamsService {

  private readonly logger = new Logger('CustomerService');

  constructor(

    @InjectRepository(ParamsExam)
    private readonly paramsExamsRepository: Repository<ParamsExam>,
    
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly exceptionService: ExceptionService,

  ){}

  /**
   * funcion que se encarga de realizar el registro de un 
   * paramyro a un examen
   * @param createParamsExamDto datos del parametro a asignar 
   * @returns 
   */
  async create(createParamsExamDto: CreateParamsExamDto) {

    try {

      // Buscar el examen asociado
      const exam = this.examRepository.create({ exa_id: createParamsExamDto.exam });
      
      // Se prepara el objeto a guardar con los nuevos nombres de campos
      const paramExam = this.paramsExamsRepository.create({
        ...createParamsExamDto,
        exam,
      });

      // Guardamos el objeto en la base de datos
      await this.paramsExamsRepository.save(paramExam);

      // Se regresa la respuesta
      return {
        status: 201,
        message: 'El parametro para el examen se ha creado correctamente',
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }


  /**
   * funcion que se encarga de realizar la actualizacion de un parametro
   * registrado en la base de datos
   * @param id id del parametros
   * @param updateParamsExamDto datos a actualizar
   * @returns 
   */
  async update(id: string, updateParamsExamDto: UpdateParamsExamDto) {
    
    try {

      // verificamos si el id del examen es valido
      const exam = this.examRepository.create({ exa_id: updateParamsExamDto.exam });

      // Preparamos los datos a actualizar usando los nombres correctos
      const paramExam = await this.paramsExamsRepository.preload({
        par_id: id,
        ...updateParamsExamDto,
        exam,
      
      });

      if (!paramExam) throw new BadRequestException('Parámetro no valido con los datos enviados');

      // Guardamos en la base de datos el registro
      await this.paramsExamsRepository.save(paramExam);

      // Se regresa la respuesta
      return {
        status: 200,
        message: 'El registro del parametro se ha actualizado correctamente',
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);

    }
  } 


  /**
   * Lista los parámetros de un examen por su ID
   * @param exa_id - ID del examen
   * @returns Lista de parámetros asociados al examen
   */
  async findByExamId(exa_id: string) {
    try {
      const params = await this.paramsExamsRepository.find({
        where: { exam: { exa_id } },
      });
      return {
        status: 200,
        data: params ?? [],
      };
    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }
 
}
