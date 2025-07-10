import { IsString, IsOptional, IsEmail, MaxLength, MinLength } from 'class-validator';

export class CreateLaboratoryDto {
    
    @IsString()
    @MaxLength(12)
    lab_nit: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(2)
    lab_dv?: string;

    @IsString()
    @MaxLength(250)
    lab_name: string;

    @IsString()
    lab_address: string;

    @IsString()
    lab_phone: string;

    @IsString()
    lab_status: string;

    @IsOptional()
    @IsString()
    lab_logo?: string;

    @IsEmail()
    lab_email: string;

    @IsString()
    @MaxLength(150)
    lab_legal_representative: string;
}
