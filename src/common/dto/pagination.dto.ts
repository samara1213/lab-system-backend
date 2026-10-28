import { ValidationPipe } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_PAGE_SIZE = 100;

/**
 * Valida y convierte la query de un listado (la validación global no entrega los números convertidos):
 * @Query(QUERY_PIPE) dto: FindXDto
 */
export const QUERY_PIPE = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

/**
 * Página, tamaño y texto de búsqueda de un listado paginado en el servidor
 * (llegan en la query: ?page=2&limit=20&search=ana)
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Página y tamaño con sus valores por defecto, y el desplazamiento para la consulta
 */
export function pageOf(dto: PaginationDto, defaultLimit = 20) {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Respuesta de un listado paginado: { status, data, meta }
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  extra: Record<string, unknown> = {},
) {
  return {
    status: 200,
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      ...extra,
    },
  };
}

/**
 * Texto de búsqueda listo para ILIKE (sin comodines del usuario), o null si está vacío
 */
export function likePattern(search?: string): string | null {
  const term = search?.trim().replace(/\s+/g, ' ');
  if (!term) return null;
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
