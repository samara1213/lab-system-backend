import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { response } from 'express';
import { retry } from 'rxjs';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class CompaniesService {

  // manejo de los log
  private readonly logger = new Logger('FincService');

  constructor(
    
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>

  ){}

  /**
   * funcion que se encarga de realizar la creacion de empresas en la base de datos
   * @param createCompanyDto Objecto con los datos de la empresa a crear
   * @returns respuesta del proceso
   */
  async create(createCompanyDto: CreateCompanyDto, user: User) {
    
    try {

      // creamos la refrencia a la compaññia que se va a guardar con los registros enviados
      const company =  this.companyRepository.create(createCompanyDto);

      //TODO: se debe obtner del token del ususario logueado
      company.com_usuario_creacion = user.use_id;

      // se inserta el registro en la base de datos
      await this.companyRepository.save(company)

      // se regresa la respuesta 
      return {
        'message': 'Empresa creada correctamente',
        'data': {...company},
      };      
      
    } catch (error) {
      
      this.handleExceptions(error);

    }
  }

  /**
   * Funcion que se encarga de obtener el listado de empresas
   * registradas
   * @returns  listado de empresa
   */
  async findAll() {

    try {

      // se realiza la consulta y se obtiene  todas las empresa
      return await this.companyRepository.find();
      
    } catch (error) {
      
      // se presenta error se regresa el error presentado
      this.handleExceptions(error);
    }

  }

  /**
   * Funcion que se encarga d erealizar la actualizacion de la empresa
   * @param id 
   * @param updateCompanyDto 
   * @param user 
   * @returns 
   */
  async update(id: string, updateCompanyDto: UpdateCompanyDto, user: User) {

    try {

      const company = await this.companyRepository.preload({

        com_id: id,
        ...updateCompanyDto,
        com_usuario_modificacion: user.use_id,
      });

      await this.companyRepository.save(company);

      //  regresamos el mensaje de exito
      return {

        message: 'Actualizacion de compañia exitosa'

      };      
      
    } catch (error) {
      
      this.handleExceptions(error);
    }
  

  }

  /**
   * Funcion que se encarga de realizar la inactivacion 
   * @param id id de la empresa a inactivar
   * @returns 
   */
  async inactive(id: string, user: User) {
    
    try {

      // se busca la empresa y se carga y se cambia el estado 
      const company = await this.companyRepository.preload({
        com_id: id,
        com_estado: 'INACTIVO',
        com_usuario_modificacion: user.use_id,
      });

      // se guardan los cambios de la empresa inactiva
      await this.companyRepository.save(company);

      // se regresa la respuesta
      return {

        message: 'Inactivacion de compañia exitosa'

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

      //this.logger.error(error)
      console.log(error)
      if (23505 === +error.code) throw new BadRequestException(' Ya existe una empresa con el mismo nit');

      // error no encontrado
      throw new InternalServerErrorException('Error del sistema')
    }
}
