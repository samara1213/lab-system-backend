import { Injectable, BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { UpdateAllianceDto } from './dto/update-alliance.dto';
import { Alliance } from './entities/alliance.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';


@Injectable()
export class AllianceService {
  constructor(
    @InjectRepository(Alliance)
    private readonly allianceRepository: Repository<Alliance>,
    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,

    private readonly exceptionService: ExceptionService, // Importamos el módulo de excepciones
  ) {}

  /**
   * Funcion que se encarga de crear una nueva alianza
   * @param lab_id id del laboratorio del usuario
   * @param createAllianceDto datos de la alianza a crear
   * @returns respuesta del proceso
   */
  async create(lab_id: string, createAllianceDto: CreateAllianceDto) {

    try {

      // la alianza siempre queda en el laboratorio del usuario
      const laboratory = this.laboratoryRepository.create({ lab_id });

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
      
      this.exceptionService.handleDBError(error);
    }

  }


  /**
   * Actualiza una alianza por su id
   * @param id id de la alianza
   * @param lab_id id del laboratorio del usuario
   * @param updateAllianceDto datos a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, lab_id: string, updateAllianceDto: UpdateAllianceDto) {

    try {

      // la alianza debe pertenecer al laboratorio del usuario
      const exists = await this.allianceRepository.exists({
        where: { ali_id: id, laboratory: { lab_id } },
      });

      // si no se encuentra la alianza, lanzamos una excepcion
      if (!exists) {
        throw new NotFoundException('El registro de alianza no existe');
      }

      // el laboratorio de la alianza no se cambia desde aqui
      const { ali_laboratory_id, ...allianceData } = updateAllianceDto;

      // preload busca la alianza y aplica los cambios
      const alliance = await this.allianceRepository.preload({
        ali_id: id,
        ...allianceData,
      });
      
      // actualizamos la alianza
      await this.allianceRepository.save(alliance);
     
      // respuesta del proceso de actualización
      return {
        status: 200,
        message: 'Alianza actualizada correctamente',
        data: alliance,
      };
    
    } catch (error) {

      this.exceptionService.handleDBError(error);
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
    
      this.exceptionService.handleDBError(error);
    }
  }

}
