import { SetMetadata } from '@nestjs/common';
import { ValidRole } from 'src/auth/interfaces/valid-role';

export const META_ROLES = 'roles';

/**
 * funcion para regresar una lista de roles
 * @param args 
 * @returns 
 */
export const RoleProtected = (...args: ValidRole[]) => {
   
    return SetMetadata(META_ROLES, args);
} 
