import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsNumber,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  exa_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  exa_description?: string;

  @IsNumber()
  @IsNotEmpty()
  exa_price: number;

  // obsoleto desde la Fase 3: el laboratorio sale de la sesion (si llega, debe ser el del usuario)
  @IsUUID()
  @IsOptional()
  laboratory?: string;

  @IsUUID()
  @IsOptional()
  alliance?: string;

  // obsoleto desde la Fase 5 (código numérico): usar "classification"; se quita en la Fase 7
  @IsString()
  @IsOptional()
  @MaxLength(100)
  exa_classification?: string;

  // clasificación del sistema o del laboratorio del usuario; null la quita
  @IsUUID()
  @IsOptional()
  classification?: string | null;
}
