import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Variables de entorno obligatorias. Si falta alguna la aplicacion no arranca,
 * en lugar de fallar mas tarde en la primera peticion que la use
 */
class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_SCHEMA: string;

  // un secreto corto se puede adivinar por fuerza bruta
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET debe tener al menos 32 caracteres' })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_KEY: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_BUCKET: string;

  // el correo es opcional para poder levantar el backend sin SMTP (pruebas, desarrollo)
  @IsOptional()
  @IsString()
  SERVICE_NOTIFICATION?: string;

  @IsOptional()
  @IsString()
  USER_NOTIFICATION?: string;

  @IsOptional()
  @IsString()
  PASSWORD_NOTIFICATION?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string;

  @IsOptional()
  @IsString()
  TRUST_PROXY?: string;
}

/**
 * Valida las variables de entorno al arrancar (ConfigModule.forRoot({ validate }))
 * @param config variables leidas del entorno y del .env
 * @returns la misma configuracion si es valida
 */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    // solo los nombres y las reglas incumplidas, nunca los valores
    const detail = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }

  return config;
}
