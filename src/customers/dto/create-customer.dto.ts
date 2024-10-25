import { Type } from "class-transformer";
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateCustomerDto {

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    cus_tipo_doc: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(15)
    cus_numero_doc:  string; 

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(25)
    cus_primer_apellido: string;

    @IsOptional()
    cus_segundo_apellido: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(25)
    cus_primer_nombre: string;

    @IsOptional()
    cus_segundo_nombre: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    cus_direccion: string;
    
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(2)
    cus_genero:  string;

    @Type(() => Date) // Convierte automáticamente el valor recibido a tipo Date
    @IsDate() // Valida que el campo sea una fecha válida
    cus_fecha_nacimiento: Date;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(10)
    cus_telefono: string; 

    @IsEmail()
    @IsNotEmpty()
    cus_correo: string; 
    
    @IsUUID()
    @IsNotEmpty()
    cus_companie: string;
     
}



