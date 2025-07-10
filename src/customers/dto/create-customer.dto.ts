import { Type } from "class-transformer";
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateCustomerDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    cus_document_type: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(15)
    cus_document_number: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(25)
    cus_first_lastname: string;

    @IsOptional()
    cus_second_lastname?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(25)
    cus_first_name: string;

    @IsOptional()
    cus_second_name?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    cus_address: string;
    
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(2)
    cus_gender: string;

    @Type(() => Date)
    @IsDate()
    cus_birthdate: Date;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(10)
    cus_phone: string;

    @IsEmail()
    @IsNotEmpty()
    cus_email: string;

    @IsUUID()
    @IsNotEmpty()
    laboratory: string;
}



