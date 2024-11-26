import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateParamsExamDto {
    
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(50)
    pae_name: string;

    @IsNotEmpty()
    pae_default_value: string;
    
    @IsBoolean()
    pae_range: boolean;
    
    @IsString()
    @IsNotEmpty()
    pae_unit_extent: string;
    
    @IsNumber()
    @IsOptional()
    pae_min_mam?: number;
    
    @IsNumber()
    @IsOptional()
    pae_max_mam?: number;
    
    @IsNumber()
    @IsOptional()
    pae_min_woman?: number;
    
    @IsNumber()
    @IsOptional()
    pae_max_womam?: number;
    
    @IsNumber()
    @IsOptional()
    pae_min_child?: number;
    
    @IsNumber()
    @IsOptional()
    pae_max_child?: number;

    @IsUUID()
    @IsNotEmpty()
    pae_exam_id: string;
 

}
