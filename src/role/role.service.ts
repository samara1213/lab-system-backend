import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateRoleDto, RolePermissionDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { User } from '../auth/entities/user.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { PermissionModule } from '../permissions/entities/permission-module.entity';
import { ACTIONS, ACTION_COLUMN } from '../permissions/permissions.constants';
import {
  buildPermissionsMap,
  hasPermission,
  isSystemUser,
} from '../permissions/permissions.helper';
import {
  NOT_FOUND_MESSAGE,
  resolveLaboratoryId,
} from '../auth/helpers/laboratory-access.helper';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(PermissionModule)
    private readonly moduleRepository: Repository<PermissionModule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Crea un rol con sus permisos. El super administrador puede crear roles
   * globales o de cualquier laboratorio; los demas, solo del suyo y sin dar
   * permisos que ellos no tienen
   * @param createRoleDto datos del rol
   * @param actor usuario autenticado
   * @returns respuesta del proceso
   */
  async create(createRoleDto: CreateRoleDto, actor: User) {
    try {
      const isSystem = isSystemUser(actor);
      const { permissions, laboratory, ...roleData } = createRoleDto;

      // sin laboratorio, el super administrador crea un rol global
      const lab_id = isSystem
        ? (laboratory ?? null)
        : resolveLaboratoryId(actor, laboratory);
      const rows = await this.validatePermissions(permissions, actor);

      await this.dataSource.transaction(async (manager) => {
        const role = await manager
          .getRepository(Role)
          .save(
            manager
              .getRepository(Role)
              .create({ ...roleData, laboratory: lab_id ? { lab_id } : null }),
          );
        await manager
          .getRepository(RolePermission)
          .save(rows.map((row) => ({ ...row, role: { rol_id: role.rol_id } })));
      });

      return {
        status: 201,
        message: 'El rol se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Roles que el usuario puede ver, con sus permisos, la cantidad de usuarios y
   * si los puede editar o asignar.
   * - Super administrador: todos (o los globales + los del laboratorio indicado).
   * - Demas: los globales que no son del sistema + los de su laboratorio
   * @param actor usuario autenticado
   * @param labId laboratorio a consultar (solo super administrador)
   * @returns listado de roles
   */
  async findAll(actor: User, labId?: string) {
    try {
      const isSystem = isSystemUser(actor);
      const scopeLabId = isSystem ? labId : resolveLaboratoryId(actor, labId);

      const query = this.roleRepository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.laboratory', 'laboratory')
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('permission.module', 'module')
        .orderBy('role.rol_is_system', 'DESC')
        .addOrderBy('role.rol_nombre', 'ASC');

      if (scopeLabId)
        query.where(
          '(role.laboratory IS NULL OR laboratory.lab_id = :scopeLabId)',
          { scopeLabId },
        );
      if (!isSystem) query.andWhere('role.rol_is_system = false');

      const roles = await query.getMany();
      const counts = await this.countUsers(roles.map((role) => role.rol_id));

      return {
        status: 200,
        data: roles.map((role) =>
          this.toResponse(
            { ...role, users_count: counts.get(role.rol_id) ?? 0 },
            actor,
            scopeLabId,
          ),
        ),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Catalogo de modulos para la matriz de permisos (los globales solo para el super administrador)
   * @param actor usuario autenticado
   */
  async findModules(actor: User) {
    try {
      const modules = await this.moduleRepository.find({
        order: { mod_order: 'ASC' },
      });

      return {
        status: 200,
        data: modules.filter(
          (module) => isSystemUser(actor) || !module.mod_global,
        ),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Busca un rol visible para el usuario
   * @param id id del rol
   * @param actor usuario autenticado
   * @returns rol encontrado
   */
  async findOne(id: string, actor: User) {
    try {
      const role = await this.findVisible(id, actor);
      return {
        status: 200,
        data: this.toResponse(role, actor, role.laboratory?.lab_id),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Actualiza nombre, descripcion, estado y permisos de un rol editable por el usuario
   * @param id id del rol
   * @param updateRoleDto datos a actualizar
   * @param actor usuario autenticado
   * @returns respuesta del proceso
   */
  async update(id: string, updateRoleDto: UpdateRoleDto, actor: User) {
    try {
      const role = await this.findVisible(id, actor);
      this.assertEditable(role, actor);

      const { permissions, ...roleData } = updateRoleDto;
      const rows = permissions
        ? await this.validatePermissions(permissions, actor)
        : null;

      await this.dataSource.transaction(async (manager) => {
        if (Object.keys(roleData).length > 0)
          await manager.getRepository(Role).update({ rol_id: id }, roleData);

        // los permisos se reemplazan completos
        if (rows) {
          await manager
            .getRepository(RolePermission)
            .delete({ role: { rol_id: id } });
          await manager
            .getRepository(RolePermission)
            .save(rows.map((row) => ({ ...row, role: { rol_id: id } })));
        }
      });

      return {
        status: 200,
        message: 'El rol se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Elimina un rol editable que no tenga usuarios asignados
   * @param id id del rol
   * @param actor usuario autenticado
   * @returns respuesta del proceso
   */
  async remove(id: string, actor: User) {
    try {
      const role = await this.findVisible(id, actor);
      this.assertEditable(role, actor);

      if (
        await this.userRepository.exists({ where: { role: { rol_id: id } } })
      ) {
        throw new ConflictException(
          'El rol tiene usuarios asignados: cámbialos de rol antes de eliminarlo',
        );
      }

      await this.roleRepository.delete({ rol_id: id });

      return {
        status: 200,
        message: 'El rol se ha eliminado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Verifica que el usuario pueda asignar el rol a un usuario del laboratorio indicado.
   * Lo usa el registro y la edicion de usuarios
   * @param roleId rol a asignar
   * @param actor usuario autenticado
   * @param targetLabId laboratorio del usuario que recibe el rol
   */
  async assertAssignable(roleId: string, actor: User, targetLabId: string) {
    const role = await this.roleRepository.findOne({
      where: { rol_id: roleId },
      relations: { laboratory: true, permissions: { module: true } },
    });

    if (!role || (role.laboratory && role.laboratory.lab_id !== targetLabId))
      throw new NotFoundException('El rol no existe');
    if (!this.canAssign(role, actor))
      throw new ForbiddenException(
        'No puede asignar un rol con más permisos que el suyo',
      );
  }

  /**
   * Cantidad de usuarios de cada rol
   */
  private async countUsers(roleIds: string[]) {
    if (roleIds.length === 0) return new Map<string, number>();
    const rows: { rol_id: string; total: string }[] = await this.userRepository
      .createQueryBuilder('user')
      .select('"user"."roleRolId"', 'rol_id')
      .addSelect('COUNT(*)', 'total')
      .where('"user"."roleRolId" IN (:...roleIds)', { roleIds })
      .groupBy('"user"."roleRolId"')
      .getRawMany();
    return new Map(rows.map((row) => [row.rol_id, Number(row.total)]));
  }

  /**
   * Busca un rol que el usuario pueda ver (si no, 404)
   */
  private async findVisible(id: string, actor: User) {
    const role = await this.roleRepository.findOne({
      where: { rol_id: id },
      relations: { laboratory: true, permissions: { module: true } },
    });

    if (!role) throw new NotFoundException(NOT_FOUND_MESSAGE);
    if (isSystemUser(actor)) return role;

    const labId = resolveLaboratoryId(actor);
    if (
      role.rol_is_system ||
      (role.laboratory && role.laboratory.lab_id !== labId)
    )
      throw new NotFoundException(NOT_FOUND_MESSAGE);

    return role;
  }

  /**
   * Reglas de edicion: los roles del sistema no se editan; los globales solo el
   * super administrador; nadie edita el rol que tiene asignado (no puede ampliarse permisos)
   */
  private assertEditable(role: Role, actor: User) {
    if (role.rol_is_system)
      throw new ForbiddenException('Los roles del sistema no se modifican');
    if (role.rol_id === actor.role?.rol_id)
      throw new ForbiddenException(
        'No puede modificar el rol que tiene asignado',
      );
    if (!isSystemUser(actor) && !role.laboratory)
      throw new ForbiddenException(
        'Solo el super administrador modifica los roles globales',
      );
  }

  /**
   * Un rol se puede asignar si esta activo y, para quien no es super administrador,
   * no es del sistema y no tiene permisos que el usuario no tenga
   */
  private canAssign(role: Role, actor: User) {
    if (!role.rol_active) return false;
    if (isSystemUser(actor)) return true;
    if (role.rol_is_system) return false;

    const rolePermissions = buildPermissionsMap(role);
    return Object.entries(rolePermissions).every(([slug, flags]) =>
      ACTIONS.every(
        (action) =>
          !flags[action] || hasPermission(actor, `${slug}:${action}` as never),
      ),
    );
  }

  /**
   * Convierte los permisos recibidos en filas de role_permissions: valida que el
   * modulo exista, quita las acciones que no aplican al modulo, exige "ver" si hay
   * otra accion y que quien no es super administrador no conceda lo que no tiene
   */
  private async validatePermissions(
    permissions: RolePermissionDto[],
    actor: User,
  ) {
    const isSystem = isSystemUser(actor);
    const modules = new Map(
      (await this.moduleRepository.find()).map((module) => [
        module.mod_slug,
        module,
      ]),
    );
    const seen = new Set<string>();
    const rows: Partial<RolePermission>[] = [];

    for (const permission of permissions) {
      const module = modules.get(permission.module);
      if (!module)
        throw new BadRequestException(
          `El módulo ${permission.module} no existe`,
        );
      if (seen.has(module.mod_slug))
        throw new BadRequestException(
          `El módulo ${module.mod_name} está repetido`,
        );
      seen.add(module.mod_slug);
      if (module.mod_global && !isSystem)
        throw new ForbiddenException(
          `Solo el super administrador asigna permisos de ${module.mod_name}`,
        );

      const flags = Object.fromEntries(
        ACTIONS.map((action) => [
          action,
          Boolean(permission[action]) && module.mod_actions.includes(action),
        ]),
      );
      if ((flags.create || flags.update || flags.delete) && !flags.view) {
        throw new BadRequestException(
          `Para crear, editar o eliminar en ${module.mod_name} el rol también debe poder ver`,
        );
      }

      for (const action of ACTIONS) {
        if (
          flags[action] &&
          !isSystem &&
          !hasPermission(actor, `${module.mod_slug}:${action}` as never)
        ) {
          throw new ForbiddenException(
            `No puede conceder un permiso que no tiene (${module.mod_name})`,
          );
        }
      }

      // solo se guardan los modulos con algun permiso
      if (!flags.view) continue;
      rows.push({
        module: { mod_slug: module.mod_slug } as PermissionModule,
        ...Object.fromEntries(
          ACTIONS.map((action) => [ACTION_COLUMN[action], flags[action]]),
        ),
      });
    }

    return rows;
  }

  /**
   * Respuesta de un rol: permisos como mapa y lo que el usuario puede hacer con el
   */
  private toResponse(
    role: Role & { users_count?: number },
    actor: User,
    scopeLabId?: string,
  ) {
    let editable = true;
    try {
      this.assertEditable(role, actor);
    } catch {
      editable = false;
    }

    return {
      rol_id: role.rol_id,
      rol_nombre: role.rol_nombre,
      rol_description: role.rol_description,
      rol_is_system: role.rol_is_system,
      rol_active: role.rol_active,
      laboratory: role.laboratory
        ? { lab_id: role.laboratory.lab_id, lab_name: role.laboratory.lab_name }
        : null,
      users_count: role.users_count ?? 0,
      permissions: buildPermissionsMap({
        ...role,
        rol_is_system: false,
        rol_active: true,
      }),
      editable,
      // asignable a usuarios del laboratorio consultado
      assignable:
        this.canAssign(role, actor) &&
        (!role.laboratory ||
          !scopeLabId ||
          role.laboratory.lab_id === scopeLabId),
    };
  }
}
