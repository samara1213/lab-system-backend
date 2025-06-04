import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateParamsExamDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    par_name: string;

    @IsNotEmpty()
    par_default_value: string;
    
    @IsBoolean()
    par_range: boolean;
    
    @IsString()
    @IsNotEmpty()
    par_unit_extent: string;
    
    @IsNumber()
    @IsOptional()
    par_min_man?: number;
    
    @IsNumber()
    @IsOptional()
    par_max_man?: number;
    
    @IsNumber()
    @IsOptional()
    par_min_woman?: number;
    
    @IsNumber()
    @IsOptional()
    par_max_woman?: number;
    
    @IsNumber()
    @IsOptional()
    par_min_child?: number;
    
    @IsNumber()
    @IsOptional()
    par_max_child?: number;

    @IsOptional()
    @IsString()
    par_reference_value?: string;

    @IsUUID()
    @IsNotEmpty()
    exam: string;
}
