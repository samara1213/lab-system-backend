import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * Resultado de un parámetro dentro del guardado en lote
 */
export class BatchResultItemDto {
  @IsUUID()
  exam: string;

  @IsUUID()
  param: string;

  // vacío = sin resultado (no se crea; uno existente se conserva)
  @IsString()
  @MaxLength(500)
  res_value: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  res_observation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  res_reference?: string;
}

/**
 * Todos los resultados de una orden en una sola petición
 */
export class CreateResultsBatchDto {
  @IsUUID()
  order: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BatchResultItemDto)
  results: BatchResultItemDto[];
}
