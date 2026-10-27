import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions.constants';

export const META_PERMISSIONS = 'permissions';

/**
 * Restringe un endpoint a los roles que tengan ALGUNO de los permisos indicados
 * ("<modulo>:<accion>"). En el metodo reemplaza al indicado en la clase.
 * Ejemplo: @RequirePermission('exams:view', 'orders:create') para la lista de
 * examenes, que tambien usa la pantalla de crear orden
 * @param permissions permisos que dan acceso
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(META_PERMISSIONS, permissions);
