import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Datos que cada usuario edita en "Mi perfil" (no incluye correo, rol ni laboratorio)
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  use_primer_nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  use_primer_apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  use_documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  use_telefono?: string;

  // aparece bajo la firma en el PDF (por ejemplo "Bacterióloga")
  @IsOptional()
  @IsString()
  @MaxLength(60)
  use_cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  use_registro_profesional?: string;
}
