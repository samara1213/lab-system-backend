import { IsIn } from 'class-validator';

export class MoveMenuDto {
  // mover la opcion antes o despues de su hermana vecina
  @IsIn(['up', 'down'])
  direction: 'up' | 'down';
}
