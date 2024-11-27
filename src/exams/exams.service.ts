import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ExamsService {

  private readonly logger = new Logger('CustomerService');

  constructor(

    @InjectRepository(Exam)

    private readonly examRepository: Repository<Exam>

  ) {}


  /**
   * funcion que se encarga de realizar el guardado  de un examen en la base de datos
   * @param createExamDto  datos del examen
   * @param user datos de ususario que esta creando el examen
   */
  async create(createExamDto: CreateExamDto, user: User) {

    try {

      // preparamos el onjecto a guardar
      const exam = this.examRepository.create(createExamDto);

      // se guarda el registro en la base de datos
      await this.examRepository.save({
        ...exam,
        exa_user_creation: user.use_id
      });

      // se regres ala respuesta
      return {

        message: 'El registro de examen creado exitosamente'

      }


    } catch (error) {

      this.handleExceptions(error);

    }
  }


  /**
   * funcion que se encarga de realizar la actualizacion d elos datos de un examen
   * @param id  identoficacion de examen a buscar
   * @param updateExamDto  datos a actualizar
   * @param user datos de ususario que lo actualizo
   * @returns respuesta del proceso
   */
  async update(id: string, updateExamDto: UpdateExamDto, user: User) {

    try {
      
      // preparamos el objejcto examen a guardar
      const exam =  await this.examRepository.preload({
        exa_id: id,
        ...updateExamDto,
        exa_user_modification: user.use_id
      });

      // guardamos la actualizacion en la base de datos
      await this.examRepository.save(exam);

      return {

        message: 'El registro de examen se actualizo'

      }

    } catch (error) {
      
      this.handleExceptions(error);

    } 

  }


  /**
   * Funcion que se encarga de buscar un examen por su id 
   * @param id  indicativo del examen
   * @returns datos del examen
   */
  async findOne(id: string) {
    
    try {

      // se buscar el registro
      const exam = await this.examRepository.findOne({
        where: { exa_id: id },
        relations:['parm_exam']        
      });

      // validamos que el registro exista
      if (!exam) throw new BadRequestException('No se encuentra registro con este valor')
      
      // filtrar por el estado del parametro
      exam.parm_exam = exam.parm_exam.filter((paramExamen) => paramExamen.pae_state === 'ACTIVO');

      // se regresa en el atributo data los datos del examen
      return {

        data: exam
      }

    } catch (error) {
      
      this.handleExceptions(error);
    }
  }


  /**
   * funcion que se encarga de obtner todos los registros de examnes
   * de una empresa
   * @param idCompany id de la empresa 
   * @returns listado de examenes
   */
  async findAllByCompany(idCompany: string) {
    
    try {

      // obtenemos el listado de examenes para las empresa
      const array_exams =  await this.examRepository.find({
        where: {exa_companie: idCompany}
      });

      // regresamos el arreglo de examenes
      return {

        data: array_exams ? array_exams : []
      
      }
      
    } catch (error) {
      
      this.handleExceptions(error);

    }

  }


  /**
 * Metodo que se encarga de validar cualquier  tipo de error 
 * @param error generado
 */
  private handleExceptions(error: any) {

    console.log(error);

    if (23505 === +error.code) throw new BadRequestException(' Ya existe registro con el mismo examen');

    // error no encontrado 
    if (400 === +error.status) throw new BadRequestException(error.response.message);

    throw new InternalServerErrorException('Error del sistema');


  }
}
