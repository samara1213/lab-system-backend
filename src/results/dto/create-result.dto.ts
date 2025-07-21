import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateResultDto {
    
  @IsString()
  @IsNotEmpty()
  res_value: string;

  @IsString()
  @IsOptional()
  res_observation?: string;

  @IsString()
  @IsOptional()
  res_reference?: string;

  @IsUUID()
  @IsNotEmpty()
  order: string;

  @IsUUID()
  @IsNotEmpty()
  exam: string;

  @IsUUID()
  @IsNotEmpty()
  param: string;
}
