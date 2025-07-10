import { IsOptional, IsString } from 'class-validator';

export class FilterOrderDto {
  @IsOptional()
  @IsString()
  ord_id?: string;

  @IsOptional()
  @IsString()
  lab_id?: string;

  @IsOptional()
  @IsString()
  cus_id?: string;

  @IsOptional()
  @IsString()
  ord_status?: string;
}
