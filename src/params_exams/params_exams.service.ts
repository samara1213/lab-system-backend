import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { Repository } from 'typeorm';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ParamsExamsService {

  private readonly logger = new Logger('CustomerService');

  constructor(

    @InjectRepository(ParamsExam)
    private readonly paramsExamsRepository: Repository<ParamsExam>   

  ){}

  /**
   * funcion que se encarga de realizar el registro de un 
   * paramyro a un examen
   * @param createParamsExamDto datos del parametro a asignar 
   * @param user datos del ussuarioque  esta creando el registro
   * @returns 
   */
  async create(createParamsExamDto: CreateParamsExamDto, user: User) {
    
    try {

      // se prepara el objecto a guardar
      const paramExam = this.paramsExamsRepository.create(createParamsExamDto);

      // guardanos el objecto en la base de datos
      await this.paramsExamsRepository.save({
        ...paramExam,
        exam:{ exa_id: createParamsExamDto.pae_exam_id },
        pae_user_creation: user.use_id
      });

      // se regresa la respuesta
      return {

        message: 'El parametro ingresado se creo correctamente'
      }
      
    } catch (error) {

      this.handleExceptions(error);
      
    }
  }


  /**
   * funcion que se encarga de realizar la actualizacion de un parametro
   * registrado en la base de datos
   * @param id id del parametros
   * @param updateParamsExamDto datos a actualizar
   * @param user datos del ususario que esta actualizando
   * @returns 
   */
  async update(id: string, updateParamsExamDto: UpdateParamsExamDto, user: User) {
   
    try {

      // preparamos los datos a actualizar
      const paramExam =  await this.paramsExamsRepository.preload({
        pae_id: id,
        ...updateParamsExamDto,
        pae_user_modification: user.use_id
      });

      // guardamos en la base de datos el registro
      await this.paramsExamsRepository.save(paramExam);

      // se regresa la respuesta
      return {

        message: 'El parametro se actualizo correctamente'
      }
      
    } catch (error) {
      
      this.handleExceptions(error);

    }

  }
  

  /**
   * funcion que se encarga de eliminar un registro logicamente
   * le coloca el estado en eliminado
   * @param id del parametro a eliminar
   */
  async remove(id: string, user: User) {
    
    try {
      
      // preparamos el registro a eliminar
      const paramExam = await this.paramsExamsRepository.preload({
        pae_id: id,
        pae_state: 'ELIMINADO',
        pae_user_modification: user.use_id
      })

      // actualizamos el registro
      await this.paramsExamsRepository.save(paramExam);

      // se regresa la respuesta
      return {

        message: 'El parametro se elimino correctamente'
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
  
      if (23505 === +error.code) throw new BadRequestException('El parametro ingresado ya existe');
  
      // error no encontrado 
      if (400 === +error.status) throw new BadRequestException(error.response.message);
  
      throw new InternalServerErrorException('Error del sistema');
  
  
    }
}
