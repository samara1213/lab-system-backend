import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateExamDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    exa_name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(250)
    exa_description: string;

    @IsNumber()
    @IsNotEmpty()
    exa_price: number;

    @IsUUID()
    @IsNotEmpty()
    exa_companie: string;

    @IsOptional()
    @IsBoolean()  
    exa_convenius?: boolean;

    @IsOptional()
    @IsString()
    exa_convenius_name?: string;

}
