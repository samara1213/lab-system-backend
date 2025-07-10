import { IsNotEmpty, IsString, MaxLength, IsUUID } from 'class-validator';

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

  @IsNotEmpty()
  @IsUUID()
  ali_laboratory_id: string;
}
