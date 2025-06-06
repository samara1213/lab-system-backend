import { Injectable, InternalServerErrorException, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
import { Repository } from 'typeorm';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  // Constructor que inyecta el repositorio de Menu
  constructor( 
   @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    private readonly exceptionService: ExceptionService,
  ){}

  /**
   * Método para crear una nueva opción de menú
   * @param createMenuDto - Datos de la opción de menú a crear
   * @returns Respuesta del proceso de creación
   */
  async create(createMenuDto: CreateMenuDto) {

    try {

      // Excluimos explícitamente 'children' si viene en el DTO (por seguridad)
      const { children, ...dtoWithoutChildren } = createMenuDto as any;     
   
      // obtnenemos solo el valor del dto
      let menuData: any = { ...dtoWithoutChildren };

      // verificamos si la opcion de menu tiene padre
      if (createMenuDto.men_parent) {

        // generamos como un tipo de referencia al padre
        menuData.men_parent = { men_id: createMenuDto.men_parent };
      }

      // creamos la referencia al menu que se va a guardar con los registros enviados
      const menu = this.menuRepository.create(menuData);

      // se inserta el registro en la base de datos
      await this.menuRepository.save(menu);

      // se regresa la respuesta
      return {
        status: 201,
        message: 'la opcion de menú se ha creado correctamente',
      };

    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }


  /**
   * Método para obtener todas las opciones de menú
   * @returns Listado de opciones de menú
   */
  async findAll() {
    
    try {
      
      // se obtiene el listado de menus
      const menus = await this.menuRepository.find();

      // se regresa la respuesta
      return {
        status: 200, 
        data: menus ?? [],
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
  }

  /**
   * Método para actualizar una opción de menú existente
   * @param id - ID de la opción de menú a actualizar
   * @param updateMenuDto - Nuevos datos para la opción de menú
   * @returns Respuesta del proceso de actualización
   */
  async update(id: string, updateMenuDto: UpdateMenuDto) {

    try {

      // Excluimos explícitamente 'children' si viene en el DTO (por seguridad)
      const { children, ...dtoWithoutChildren } = updateMenuDto as any;

      // obtnenemos solo el valor del dto
      let menuData: any = { ...dtoWithoutChildren };

      // verificamos si la opcion de menu tiene padre
      if (updateMenuDto.men_parent) {

        // generamos como un tipo de referencia al padre
        menuData.men_parent = { men_id: updateMenuDto.men_parent };
      }
      // Preload busca y prepara la entidad para actualizar
      const menu = await this.menuRepository.preload({
        men_id: id,
        ...menuData,
      });
      
      // Si no se encuentra el menú, lanzamos una excepción
      await this.menuRepository.save(menu);

      return {
        status: 200,
        message: 'La opción de menú se ha actualizado correctamente',
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);

    }
  }

  /**
   * Método para obtener una opción de menú por su ID
   * @param id - ID de la opción de menú a buscar
   * @returns Opción de menú encontrada
   */
async getMenuParentByLevel(level: number) {

    try {
      // Buscar todos los menús con el nivel especificado
      const menus = await this.menuRepository.find({
        where: { men_level: level }
      });

      return {
        status: 200,
        data: menus ?? [],
      };

    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
