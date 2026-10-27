import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Menu } from '../menu/entities/menu.entity';
import { PermissionModule } from './entities/permission-module.entity';
import { buildPermissionsMap, PermissionsMap } from './permissions.helper';

export interface MenuNode {
  men_id: string;
  men_name: string;
  men_url: string | null;
  men_icon: string | null;
  men_level: number;
  men_order: number;
  module: string | null;
  children: MenuNode[];
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionModule)
    private readonly moduleRepository: Repository<PermissionModule>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  /**
   * Catalogo de modulos en orden
   * @param includeGlobal incluir los modulos globales (solo para roles del sistema)
   */
  async findModules(includeGlobal: boolean) {
    const modules = await this.moduleRepository.find({
      order: { mod_order: 'ASC' },
    });
    return includeGlobal
      ? modules
      : modules.filter((module) => !module.mod_global);
  }

  /**
   * Datos de la sesion: usuario, laboratorio, rol, permisos por modulo y el menu
   * que puede ver (lo usan el login, /auth/me y el refresco del token)
   * @param user usuario con laboratory y role.permissions.module cargados
   */
  async buildSession(user: User) {
    const modules = await this.moduleRepository.find({
      select: { mod_slug: true },
    });
    const permissions = buildPermissionsMap(
      user.role,
      modules.map((module) => module.mod_slug),
    );
    const menus = await this.buildMenuTree(
      permissions,
      Boolean(user.role?.rol_active && user.role.rol_is_system),
    );
    const { role, laboratory } = user;

    return {
      use_id: user.use_id,
      use_primer_nombre: user.use_primer_nombre,
      use_primer_apellido: user.use_primer_apellido,
      use_correo: user.use_correo,
      use_documento: user.use_documento,
      use_telefono: user.use_telefono,
      use_primer_ingreso: user.use_primer_ingreso,
      use_estado: user.use_estado,
      use_ultimo_ingreso: user.use_ultimo_ingreso,
      use_cargo: user.use_cargo,
      use_registro_profesional: user.use_registro_profesional,
      // la ruta de la firma no sale del backend: solo si existe
      has_signature: Boolean(user.use_firma_path),
      laboratory: laboratory ?? null,
      role: role
        ? {
            rol_id: role.rol_id,
            rol_nombre: role.rol_nombre,
            rol_is_system: role.rol_is_system,
            menus,
          }
        : null,
      permissions,
    };
  }

  /**
   * Arbol de menus activos que el usuario puede ver, ordenado por men_order.
   * Una opcion se ve si el rol puede ver su modulo; un grupo, si tiene alguna opcion visible.
   * Las opciones con url y sin modulo solo las ve un rol del sistema
   * @param permissions permisos del usuario por modulo
   * @param isSystem el usuario tiene un rol del sistema
   */
  async buildMenuTree(
    permissions: PermissionsMap,
    isSystem: boolean,
  ): Promise<MenuNode[]> {
    // la tabla de menus es pequeña: se lee completa y el arbol se arma en memoria
    const rows = await this.menuRepository.find({
      where: { men_active: true },
      relations: { men_parent: true, module: true },
      order: { men_order: 'ASC', men_name: 'ASC' },
    });

    const nodes = new Map<string, MenuNode>();
    for (const row of rows) {
      nodes.set(row.men_id, {
        men_id: row.men_id,
        men_name: row.men_name,
        men_url: row.men_url,
        men_icon: row.men_icon,
        men_level: row.men_level,
        men_order: row.men_order,
        module: row.module?.mod_slug ?? null,
        children: [],
      });
    }

    const roots: MenuNode[] = [];
    for (const row of rows) {
      const node = nodes.get(row.men_id);
      const parent = row.men_parent
        ? nodes.get(row.men_parent.men_id)
        : undefined;
      if (parent) parent.children.push(node);
      // un hijo de un grupo inactivo queda fuera; los de nivel 1 son raices
      else if (!row.men_parent) roots.push(node);
    }

    const canSee = (node: MenuNode) =>
      node.module ? Boolean(permissions[node.module]?.view) : isSystem;

    // poda de abajo hacia arriba: hojas sin permiso y grupos vacios
    const prune = (list: MenuNode[]): MenuNode[] =>
      list
        .map((node) => ({ ...node, children: prune(node.children) }))
        .filter((node) =>
          node.men_url ? canSee(node) : node.children.length > 0,
        );

    return prune(roots);
  }
}
