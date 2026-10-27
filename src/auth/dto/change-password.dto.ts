import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsEmail()
  use_correo: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  use_old_contrasena: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  use_new_contrasena: string;
}
