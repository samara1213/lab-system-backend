import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';
import { response } from 'express';
import { retry } from 'rxjs';

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
  async create(createCompanyDto: CreateCompanyDto) {
    
    try {

      // creamos la refrencia a la compaññia que se va a guardar con los registros enviados
      const company =  this.companyRepository.create(createCompanyDto);

      //TODO: se debe obtner del token del ususario logueado
      company.com_usuario_creacion = 'fancisco'

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

  findAll() {
    return `This action returns all companies`;
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: number, updateCompanyDto: UpdateCompanyDto) {
    return `This action updates a #${id} company`;
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
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
