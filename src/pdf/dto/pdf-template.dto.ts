import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// los campos llegan como texto en el formulario multipart junto con el archivo
export class CreatePdfTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  tpl_name: string;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  tpl_description?: string;

  // sin laboratorio = plantilla del sistema
  @IsUUID()
  @IsOptional()
  laboratory?: string;
}

// solo el nombre y la descripción: el contenido y el laboratorio no cambian
export class UpdatePdfTemplateDto extends PartialType(
  OmitType(CreatePdfTemplateDto, ['laboratory'] as const),
) {}

export class PreviewPdfTemplateDto {
  // laboratorio cuyos datos y logo se muestran en la vista previa
  @IsUUID()
  @IsOptional()
  laboratory?: string;
}

export class FindPdfTemplatesDto {
  // "system" = solo las del sistema; un id = solo las de ese laboratorio; vacío = todas
  @IsOptional()
  @ValidateIf((dto) => dto.laboratory !== 'system')
  @IsUUID()
  laboratory?: string;
}

export const PDF_TEMPLATE_EXTENSIONS = ['.html', '.htm'];
export const isTemplateFileName = (name: string) =>
  PDF_TEMPLATE_EXTENSIONS.some((ext) => name?.toLowerCase().endsWith(ext));
