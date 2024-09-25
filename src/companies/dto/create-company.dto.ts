import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCompanyDto {
    
    @IsNotEmpty()
    @IsString()    
    @MinLength(1)
    @MaxLength(11)
    com_nit: string;    
    
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(2)
    com_dv: string;
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    com_nombre: string;
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    com_direccion: string;
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    com_telefono: string;
    
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(50)
    com_correo: string;   

    @IsString()
    @IsNotEmpty() 
    com_estado: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    com_representante_legal: string; 

}
