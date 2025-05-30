import { IsNotEmpty, IsString, MaxLength, IsNumber, IsUUID, IsOptional } from "class-validator";

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  exa_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  exa_description?: string;

  @IsNumber()
  @IsNotEmpty()
  exa_price: number;

  @IsUUID()
  @IsNotEmpty()
  laboratory: string;

  @IsUUID()
  @IsOptional()
  alliance?: string;
}
