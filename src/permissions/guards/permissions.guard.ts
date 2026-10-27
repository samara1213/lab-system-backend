import { Reflector } from '@nestjs/core';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../auth/entities/user.entity';
import { META_PERMISSIONS } from '../decorators/require-permission.decorator';
import { Permission } from '../permissions.constants';
import { hasPermission } from '../permissions.helper';

/**
 * Exige que el rol del usuario tenga alguno de los permisos de @RequirePermission.
 * Sin @RequirePermission basta con la sesion (por ejemplo /auth/me)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required: Permission[] = this.reflector.getAllAndOverride(
      META_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as User;
    if (!user)
      throw new InternalServerErrorException(
        'Usuario no presente en la request',
      );

    if (required.some((permission) => hasPermission(user, permission)))
      return true;

    throw new ForbiddenException('No tiene permisos para realizar esta acción');
  }
}
