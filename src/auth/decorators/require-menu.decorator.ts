import { SetMetadata } from '@nestjs/common';

export const META_MENUS = 'menus';

/**
 * Restringe un endpoint a los usuarios cuyo rol tenga asignada alguna de las
 * opciones de menu indicadas (por su men_url, por ejemplo '/users')
 * @param urls urls de las opciones de menu que dan acceso
 */
export const RequireMenu = (...urls: string[]) => {

    return SetMetadata(META_MENUS, urls);
}
