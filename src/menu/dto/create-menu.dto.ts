import {
  IsString,
  IsUUID,
  MaxLength,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  IsBoolean,
  Matches,
  MinLength,
} from 'class-validator';
import { MODULES } from '../../permissions/permissions.constants';

export class CreateMenuDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  men_name: string;

  // sin padre la opcion queda en el primer nivel (maximo 3 niveles)
  @IsOptional()
  @IsUUID()
  men_parent?: string | null;

  // ruta del frontend; sin url la opcion es un grupo
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^\/?[a-z0-9\-/]*$/i, {
    message: 'La url solo admite letras, números, "-" y "/"',
  })
  men_url?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+:[a-z0-9-]+$/, {
    message:
      'El ícono debe tener el formato colección:nombre (por ejemplo mdi:home-outline)',
  })
  men_icon?: string | null;

  // modulo que da acceso a la opcion (obligatorio si tiene url)
  @IsOptional()
  @IsIn(Object.values(MODULES))
  module?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  men_order?: number;

  @IsOptional()
  @IsBoolean()
  men_active?: boolean;
}
