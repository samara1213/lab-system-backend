import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';
import { META_MENUS } from '../../decorators/require-menu.decorator';

/**
 * Normaliza una url de menu para compararla ('Users/' y '/users' son iguales)
 */
const normalizeUrl = (url: string) =>
  '/' +
  (url ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');

@Injectable()
export class MenuAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredMenus: string[] = this.reflector.getAllAndOverride(
      META_MENUS,
      [context.getHandler(), context.getClass()],
    );

    // si el endpoint no exige opciones de menu se permite el acceso
    if (!requiredMenus || requiredMenus.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user)
      throw new InternalServerErrorException(
        'Usuario no presente en la request',
      );

    // urls de los menus asignados al rol del usuario (las carga JwtStrategy)
    const userMenus = new Set(
      (user.role?.menus ?? []).map((menu) => normalizeUrl(menu.men_url)),
    );

    if (requiredMenus.some((url) => userMenus.has(normalizeUrl(url))))
      return true;

    throw new ForbiddenException('No tiene permisos para realizar esta acción');
  }
}
