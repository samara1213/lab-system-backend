import { Role } from '../role/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import {
  Action,
  ACTIONS,
  ACTION_COLUMN,
  Permission,
} from './permissions.constants';

export type PermissionFlags = Record<Action, boolean>;
export type PermissionsMap = Record<string, PermissionFlags>;

/**
 * Permisos del rol como mapa { modulo: { view, create, update, delete } }.
 * Requiere role.permissions con su module cargado. Un rol inactivo no tiene permisos
 * @param role rol del usuario
 * @param modules slugs de todos los modulos (para los roles del sistema)
 */
export function buildPermissionsMap(
  role: Role | undefined,
  modules: string[] = [],
): PermissionsMap {
  const map: PermissionsMap = {};
  if (!role?.rol_active) return map;

  // el rol del sistema puede todo en todos los modulos
  if (role.rol_is_system) {
    for (const slug of modules)
      map[slug] = { view: true, create: true, update: true, delete: true };
    return map;
  }

  for (const permission of role.permissions ?? []) {
    const slug = permission.module?.mod_slug;
    if (!slug) continue;
    map[slug] = Object.fromEntries(
      ACTIONS.map((action) => [
        action,
        Boolean(permission[ACTION_COLUMN[action]]),
      ]),
    ) as PermissionFlags;
  }
  return map;
}

/**
 * Indica si el usuario tiene el permiso ("<modulo>:<accion>")
 * @param user usuario autenticado (JwtStrategy carga role.permissions.module)
 * @param permission permiso requerido
 */
export function hasPermission(
  user: User | undefined,
  permission: Permission,
): boolean {
  const role = user?.role;
  if (!role?.rol_active) return false;
  if (role.rol_is_system) return true;

  const [slug, action] = permission.split(':') as [string, Action];
  const granted = (role.permissions ?? []).find(
    (p) => p.module?.mod_slug === slug,
  );
  return Boolean(granted?.[ACTION_COLUMN[action]]);
}

/**
 * Indica si el usuario tiene un rol del sistema (super administrador)
 */
export const isSystemUser = (user: User | undefined): boolean =>
  Boolean(user?.role?.rol_active && user.role.rol_is_system);
