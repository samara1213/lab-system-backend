import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FilterOrderDto {
  @IsOptional()
  @IsUUID()
  ord_id?: string;

  @IsOptional()
  @IsUUID()
  lab_id?: string;

  @IsOptional()
  @IsUUID()
  cus_id?: string;

  @IsOptional()
  @IsString()
  ord_status?: string;
}
