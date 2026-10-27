import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';

// el laboratorio de un rol no cambia despues de creado
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['laboratory'] as const),
) {}
