import { IsIn } from 'class-validator';

export class ChangeUserStatusDto {
  @IsIn(['ACTIVO', 'INACTIVO'])
  use_estado: 'ACTIVO' | 'INACTIVO';
}
