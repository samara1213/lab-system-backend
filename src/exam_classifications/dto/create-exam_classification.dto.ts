import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExamClassificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  cla_name: string;

  @IsInt()
  @Min(0)
  @Max(999)
  @IsOptional()
  cla_order?: number;

  @IsBoolean()
  @IsOptional()
  cla_show_images?: boolean;

  @IsBoolean()
  @IsOptional()
  cla_active?: boolean;

  // solo el super administrador elige: sin laboratorio = clasificación del sistema;
  // los demás usuarios siempre crean en su laboratorio (si lo envían, debe ser el suyo)
  @IsUUID()
  @IsOptional()
  laboratory?: string;
}
