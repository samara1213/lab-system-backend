import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config';

// el CLI de TypeORM no carga el .env por si mismo; en Railway las variables ya vienen del entorno
try {
  process.loadEnvFile();
} catch {
  // sin archivo .env: se usan las variables del entorno
}

/**
 * DataSource que usa el CLI de migraciones (yarn migration:*)
 */
export default new DataSource({
  ...buildDataSourceOptions(),
  entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
});
