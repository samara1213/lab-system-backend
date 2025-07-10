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

    @IsNotEmpty()
    @IsString()
    role: string; // Debe ser un UUID (id del rol)

    @IsNotEmpty()
    @IsString()
    laboratory: string; // Debe ser un UUID (id de la empresa)
}