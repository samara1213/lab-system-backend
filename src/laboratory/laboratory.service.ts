import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { Laboratory } from './entities/laboratory.entity';

@Injectable()
export class LaboratoryService {
  private readonly logger = new Logger(LaboratoryService.name);

  constructor(
    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,
  ) {}


  /**
   * Funcion que se encarga de realizar la creacion de laboratorios en la base de datos
   * @param createLaboratoryDto Objeto con los datos del laboratorio a crear
   * @returns respuesta del proceso
   */
  async create(createLaboratoryDto: CreateLaboratoryDto) {
    try {
      // creamos la refrencia al laboratorio que se va a guardar con los registros enviados 
      const laboratory = this.laboratoryRepository.create(createLaboratoryDto);

      // se inserta el registro en la base de datos
      await this.laboratoryRepository.save(laboratory);

      // se regresa la respuesta
      return {
        'status': 201,
        'message': 'El registro de laboratorio se ha creado correctamente',
      };

    } catch (error) {

      this.handleDBError(error);
    }
  }


  /**
   * Funcion que se encarga de obtener el listado de laboratorios
   * registrados
   * @returns listado de laboratorios
   */
   async findAll() {
    
    try {

      // se obtiene el listado de laboratorios
      const laboratories = await this.laboratoryRepository.find();

      return {
        status: 200,
        data: laboratories ?? [],
      };
      
    } catch (error) {
      
      this.handleDBError(error);
      
    }
    
  }

  /**
   * Funcion que se encarga de buscar un laboratorio por su id
   * @param id id del laboratorio a buscar
   * @returns laboratorio encontrado
   */
  async findOne(id: string) {

    try {

      const laboratory = await this.laboratoryRepository.findOneBy({ lab_id: id });
      
      // si no se encuentra el laboratorio se lanza una excepcion
      if (!laboratory) {
      
        // se lanza una excepcion de no encontrado
        throw new NotFoundException('Laboratory not found');
      
      }
      
      // se regresa el laboratorio encontrado
      return {
        status: 200,
        data: laboratory,
      };

    } catch (error) {

      this.handleDBError(error);
    }
  }


  /**
   * Funcion que se encarga de actualizar un laboratorio
   * @param id id del laboratorio a actualizar
   * @param updateLaboratoryDto datos a actualizar
   * @returns mensaje de exito
   */
  async update(id: string, updateLaboratoryDto: UpdateLaboratoryDto) {
    
    try {

      // se busca el laboratorio por su id
      const laboratory = await this.laboratoryRepository.preload({
        lab_id: id, 
        ...updateLaboratoryDto,
      });

      // realizamos la actualizacion del registro
      await this.laboratoryRepository.save(laboratory);

      return {
        status: 200,
        message: 'El registro de laboratorio se ha actualizado correctamente',
      };
           
    } catch (error) {
      
      this.handleDBError(error);
    }

  }

  /**
   * Funcion que se encarga de eliminar un laboratorio
   * @param id id del laboratorio a eliminar
   * @returns mensaje de exito
   */
  async inactive(id: string) {

    try {

      // se busca el laboratorio por su id y se cambia su estado a inactivo
      const laboratory = await this.laboratoryRepository.preload({
        lab_id: id,
        lab_status: 'INACTIVO',
      });

      // cambiamos el estado del laboratorio a inactivo
      await this.laboratoryRepository.save(laboratory);

      // respuesta de exito
      return {
        status: 200,
        message: 'El laboratorio se ha inactivado correctamente',

      }
      
    } catch (error) {
      
      this.handleDBError(error);
      
    }
  }

  /**
   * Funcion que se encarga de manejar los errores de la base de datos
   * @param error error a manejar
   * @returns mensaje de error
   */
  private handleDBError(error: any): never {
  
    this.logger.error(error);
  
    if (error.code === '23505') {
      
      // Error de clave duplicada (Postgres)
      throw new ConflictException('Ya existe un laboratorio con ese nombre');
  
    }

    throw new InternalServerErrorException('error al procesar la solicitud, por favor intente más tarde');
  }
}
