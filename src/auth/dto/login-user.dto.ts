import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginUserDto {

    @IsEmail()
    use_correo: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    @MaxLength(12)
    use_contrasena: string;

}