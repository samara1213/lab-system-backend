import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsOptional, Matches } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// estados de orden que se pueden filtrar (texto libre en la base)
export const ORDER_STATUSES = [
  'PENDIENTE',
  'PROCESANDO',
  'ORDEN CON ADJUNTO',
  'PENDIENTE PDF',
  'FINALIZADA',
  'CANCELADA',
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Búsqueda de órdenes: texto (número de orden, documento o nombre del paciente),
 * estados (?status=PENDIENTE,FINALIZADA) y rango de fechas de ingreso (día en Colombia)
 */
export class FindOrdersDto extends PaginationDto {
  @IsOptional()
  // class-transformer también llama a la función cuando el filtro no llega
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : (Array.isArray(value) ? value : String(value).split(','))
          .map((status: string) => status.trim())
          .filter(Boolean),
  )
  @IsArray()
  @IsIn(ORDER_STATUSES, { each: true })
  status?: string[];

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Fecha con formato AAAA-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Fecha con formato AAAA-MM-DD' })
  to?: string;
}
