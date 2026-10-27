import {
  IsHexadecimal,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  // token enviado por correo (32 bytes en hexadecimal)
  @IsHexadecimal()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  use_new_contrasena: string;
}
