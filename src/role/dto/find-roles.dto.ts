import { IsOptional, IsUUID } from 'class-validator';

export class FindRolesDto {
  // solo el super administrador: roles disponibles para ese laboratorio
  @IsOptional()
  @IsUUID()
  laboratory?: string;
}
