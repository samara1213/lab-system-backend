import { IsOptional, IsUUID } from 'class-validator';

export class FindExamClassificationsDto {
  // solo el super administrador: las del sistema + las de ese laboratorio
  @IsOptional()
  @IsUUID()
  laboratory?: string;
}
