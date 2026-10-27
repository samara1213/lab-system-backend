import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateAllianceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  ali_nombre: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  ali_direccion: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  ali_telefono: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  ali_nombre_contacto: string;

  // obsoleto desde la Fase 3: el laboratorio sale de la sesion (si llega, debe ser el del usuario)
  @IsOptional()
  @IsUUID()
  ali_laboratory_id?: string;
}
