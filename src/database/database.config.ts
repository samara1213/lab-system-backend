import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/**
 * Opciones de conexion comunes a la aplicacion (AppModule) y al CLI de
 * migraciones (data-source.ts), para que ambos usen exactamente la misma base
 */
export function buildDataSourceOptions(): DataSourceOptions {

  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    schema: process.env.DB_SCHEMA,
    // el esquema solo cambia con migraciones (yarn migration:run), nunca automaticamente
    synchronize: false,
    migrationsRun: false,
    migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
    migrationsTableName: 'migrations',
  };
}
