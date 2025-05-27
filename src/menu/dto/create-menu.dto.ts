import { IsString, IsInt, IsUUID, MaxLength, IsOptional, ValidateIf } from 'class-validator';

export class CreateMenuDto {
    
    @IsString()
    @MaxLength(50)
    men_name: string;

    @IsOptional()
    @IsInt()
    men_level?: number;

    @ValidateIf(o => o.men_level > 1)
    @IsUUID()
    men_parent?: string;
}
