import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

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
    use_correo: string;
}