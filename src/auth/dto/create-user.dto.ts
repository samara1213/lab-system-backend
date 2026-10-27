import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  use_primer_nombre: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  use_primer_apellido: string;

  @IsEmail()
  @MaxLength(120)
  use_correo: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  use_documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  use_telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  use_cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  use_registro_profesional?: string;

  @IsUUID()
  role: string; // id del rol

  // solo el super administrador lo indica; para los demas es el laboratorio de su sesion
  @IsOptional()
  @IsUUID()
  laboratory?: string;
}
