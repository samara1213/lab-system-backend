import { IsNumber, IsOptional, IsString, IsUUID, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  ord_total_value: number;

  @IsOptional()
  @IsNumber()
  ord_discount_percentage?: number;

  @IsOptional()
  @IsNumber()
  ord_discount_value?: number;

  @IsOptional()
  @IsString()
  ord_status?: string;

  @IsString()
  lab_id: string; // Laboratory UUID

  @IsString()
  cus_id: string; // Customer UUID

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  exa_ids: string[]; // Lista de exámenes (UUIDs)
}
