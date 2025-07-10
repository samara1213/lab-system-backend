import { IsString, IsArray, ArrayNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @MaxLength(50)
    rol_nombre: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsUUID('all', { each: true })
    menus: string[]; // lista de IDs de menús asociados al rol
}
