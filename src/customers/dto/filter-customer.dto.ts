import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class FilterCustomerDto {
  // obsoleto desde la Fase 3: el laboratorio sale de la sesion (si llega, debe ser el del usuario)
  @IsOptional()
  @IsUUID()
  laboratory?: string;

  @IsString()
  @IsNotEmpty()
  cus_document_number: string;
}
