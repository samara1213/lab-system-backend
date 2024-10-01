import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {

    @IsEmail()
    use_correo: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(12)
    use_old_contrasena: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(12)
    use_new_contrasena: string;

}