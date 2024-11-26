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

  findAll() {
    return `This action returns all paramsExams`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paramsExam`;
  }

  update(id: number, updateParamsExamDto: UpdateParamsExamDto) {
    return `This action updates a #${id} paramsExam`;
  }

  remove(id: number) {
    return `This action removes a #${id} paramsExam`;
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
