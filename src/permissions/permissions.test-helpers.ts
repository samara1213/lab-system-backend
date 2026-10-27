import { User } from '../auth/entities/user.entity';

type Flags = Partial<Record<'view' | 'create' | 'update' | 'delete', boolean>>;

/**
 * Usuario de prueba con un rol y sus permisos por modulo (solo para *.spec.ts)
 * @param permissions { modulo: { view, create, ... } }
 * @param options rol del sistema, rol inactivo, laboratorio
 */
export function userWith(
  permissions: Record<string, Flags> = {},
  options: {
    system?: boolean;
    active?: boolean;
    labId?: string;
    roleId?: string;
    userId?: string;
  } = {},
): User {
  return {
    use_id: options.userId ?? 'user-1',
    laboratory: { lab_id: options.labId ?? 'lab-a' },
    role: {
      rol_id: options.roleId ?? 'role-actor',
      rol_is_system: options.system ?? false,
      rol_active: options.active ?? true,
      permissions: Object.entries(permissions).map(([slug, flags]) => ({
        module: { mod_slug: slug },
        rpe_can_view: Boolean(flags.view),
        rpe_can_create: Boolean(flags.create),
        rpe_can_update: Boolean(flags.update),
        rpe_can_delete: Boolean(flags.delete),
      })),
    },
  } as unknown as User;
}
