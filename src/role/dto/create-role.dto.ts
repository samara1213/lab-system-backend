import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MODULES } from '../../permissions/permissions.constants';

/**
 * Permisos del rol sobre un modulo
 */
export class RolePermissionDto {
  @IsIn(Object.values(MODULES))
  module: string;

  @IsBoolean()
  view: boolean;

  @IsBoolean()
  create: boolean;

  @IsBoolean()
  update: boolean;

  @IsBoolean()
  delete: boolean;
}

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  rol_nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rol_description?: string;

  @IsOptional()
  @IsBoolean()
  rol_active?: boolean;

  // solo el super administrador: laboratorio del rol (sin enviarlo, el rol es global)
  @IsOptional()
  @IsUUID()
  laboratory?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}
