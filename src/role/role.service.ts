import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class RoleService {

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly exceptionService: ExceptionService, 
  ) {}



  /**
   * Funcion que se encarga de realizar la creacion de roles en la base de datos
   * @param createRoleDto Objeto con los datos del rol a crear
   * @returns respuesta del proceso
   */
  async create(createRoleDto: CreateRoleDto) {

    try {

      // Creamos la instancia del rol
      const { menus, ...roleData } = createRoleDto;
      const role = this.roleRepository.create(roleData);

      // Asignamos los menús como objetos con solo el id
      if (menus && menus.length > 0) {

        role.menus = menus.map((id) => ({ men_id: id }) as any);

      } else {

        role.menus = [];
      }

      // Guardamos el rol en la base de datos
      await this.roleRepository.save(role);
      
      return {
        status: 201,
        message: 'El registo de rol se ha creado correctamente',

      };

    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
    
  }

  /**
   * Funcion que se encarga de obtener el listado de roles
   * registrados
   * @returns listado de roles
   */
  async findAll() {
    try {
      // Obtenemos el listado de roles con las opciones de menú asignadas
      const roles = await this.roleRepository.find({
        relations: ['menus'],
      });
      // Solo retornamos el id de las opciones de menú asignadas como array de strings
      return {
        status: 200,
        data: roles ?? [],
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }


  /**
   * Funcion que se encarga de buscar un rol por su id
   * @param id id del rol a buscar
   * @returns rol encontrado
   */
  async findOne(id: string) {

    try {
    
      // Buscamos el rol por su id
      const role = await this.roleRepository.findOneBy({ rol_id: id });
    
      if (!role) {
        throw new NotFoundException('Rol no encontrado');
    
      }
    
      // Retornamos el rol encontrado
      return {
        status: 200,
        data: role,
    
      };
    
    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Funcion que se encarga de actualizar un rol
   * @param id id del rol a actualizar
   * @param updateRoleDto Objeto con los datos del rol a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {

    try {
    
      const { menus, ...roleData } = updateRoleDto;
      // Preload busca y prepara la entidad para actualizar
    
      const role = await this.roleRepository.preload({
        rol_id: id,
        ...roleData,
      });
    
      if (!role) {
        throw new NotFoundException('Rol no encontrado');
      }
    
      // Actualizamos los menús asociados si se envían
      if (menus && menus.length > 0) {
    
        role.menus = menus.map((menuId) => ({ men_id: menuId }) as any);
    
      } else if (menus) {
    
        // Si se envía un array vacío, quitamos todos los menús
    
        role.menus = [];
      }
    
      // Guardamos el rol actualizado en la base de datos
      await this.roleRepository.save(role);
    
      return {
        status: 200,
        message: 'El rol se ha actualizado correctamente',
      };

    } catch (error) {
      
      this.exceptionService.handleDBError(error);
    }
  }

}
