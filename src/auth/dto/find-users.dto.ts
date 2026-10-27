import { IsOptional, IsUUID } from 'class-validator';

export class FindUsersDto {
  // solo el super administrador puede consultar otro laboratorio
  @IsOptional()
  @IsUUID()
  laboratory?: string;
}
