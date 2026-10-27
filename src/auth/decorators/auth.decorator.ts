import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../permissions/guards/permissions.guard';

/**
 * Exige un token valido y, si el endpoint usa @RequirePermission, que el rol
 * del usuario tenga alguno de esos permisos
 */
export function Auth() {
  return applyDecorators(UseGuards(AuthGuard(), PermissionsGuard));
}
