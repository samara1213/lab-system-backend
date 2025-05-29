import { Injectable, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { UpdateAllianceDto } from './dto/update-alliance.dto';
import { Alliance } from './entities/alliance.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';

@Injectable()
export class AllianceService {
  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepository: Repository<Alliance>,
    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,
  ) {}

  /**
   * Funcion que se encarga de crear una nueva alianza
   * @param createAllianceDto datos de la alianza a crear
   * @returns respuesta del proceso
   */ 
  async create(createAllianceDto: CreateAllianceDto) {

    try {

      // refrencia del laboratorio que se va a guardar con los registros enviados
      const laboratory = this.laboratoryRepository.create({

        lab_id: createAllianceDto.ali_laboratory_id
      });

      // Crear la alianza con los datos proporcionados
      const alliance = this.allianceRepository.create({
        ...createAllianceDto,
        laboratory,
      });

      // guardamos el registro en la base de datos
      await this.allianceRepository.save(alliance);

      // respuesta del proceso de creacion
      return {
        status: 201,
        message: 'se ha creado correctamente la alianza',
      };

    } catch (error) {
      
      this.handleDBError(error);
    }

  }


  /**
   * Actualiza una alianza por su id
   * @param id id de la alianza
   * @param updateAllianceDto datos a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, updateAllianceDto: UpdateAllianceDto) {

    try {
      
      // declaramos la variable laboratory como undefined
      let laboratory = undefined;
    
      // validamos si se envio el id del laboratorio para actualizarlo
      if (updateAllianceDto.ali_laboratory_id) {

        // creamos la referencia al laboratorio que se va a guardar con los registros enviados
        laboratory = this.laboratoryRepository.create({
          lab_id: updateAllianceDto.ali_laboratory_id
        });
      }
    
      // Preparamos el objeto a actualizar
      const updateData: any = {
        ...updateAllianceDto,
      };
    
      // Si se envió un nuevo laboratorio, lo agregamos al objeto de actualización
      if (laboratory) updateData.laboratory = laboratory;
     
      // preload busca la alianza y aplica los cambios
      const alliance = await this.allianceRepository.preload({
        ali_id: id,
        ...updateData,
      });

      // si no se encuentra la alianza, lanzamos una excepcion
      if (!alliance) {
        throw new BadRequestException('El registro de alianza no existe');
      }
      
      // actualizamos la alianza
      await this.allianceRepository.save(alliance);
     
      // respuesta del proceso de actualización
      return {
        status: 200,
        message: 'Alianza actualizada correctamente',
        data: alliance,
      };
    
    } catch (error) {

      this.handleDBError(error);
    }
  }  

  /**
   * Lista todas las alianzas de un laboratorio por su id
   * @param lab_id id del laboratorio
   * @returns lista de alianzas
   */
  async findAllByLaboratory(lab_id: string) {

    try {
      // buscamos los registros de alianzas por el id del laboratorio
      const alliances = await this.allianceRepository.find({
        where: { laboratory: { lab_id } },
      });
    
      // regresamos la lista de alianzas
      return {
        status: 200,
        data: alliances ?? [],
      }
    
    } catch (error) {
    
      this.handleDBError(error);
    }
  }

  /**
   * Maneja los errores de la base de datos
   * @param error Error capturado
   */
  private handleDBError(error: any) {
  
    if (error.code === '23505') {
      throw new ConflictException('Registro duplicado');
    }
    if (error.status === 400) {
      throw new BadRequestException('registro no encontrado o datos inválidos');
    }
    throw new InternalServerErrorException('Error al procesar la solicitud, por favor intente más tarde');
  }
}
