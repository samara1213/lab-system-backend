/**
 * Variables de entorno de las pruebas e2e. Se ejecuta antes de importar
 * AppModule (ConfigModule lee process.env al cargarse).
 *
 * Requiere E2E_DB_URL (postgresql://usuario:clave@host:puerto/base) apuntando a
 * una base que termine en "_e2e": las pruebas la BORRAN y la recrean.
 */
const url = process.env.E2E_DB_URL;

if (!url) {
  throw new Error(
    'Defina E2E_DB_URL (postgresql://usuario:clave@host:puerto/laboratorio_e2e) para correr las pruebas e2e',
  );
}

const parsed = new URL(url);
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

// protección: nunca correr contra una base que no sea de pruebas
if (!database.endsWith('_e2e')) {
  throw new Error(
    `E2E_DB_URL debe apuntar a una base cuyo nombre termine en "_e2e" (recibido: "${database}")`,
  );
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '3999',
  DB_HOST: parsed.hostname,
  DB_PORT: parsed.port || '5432',
  DB_NAME: database,
  DB_USER: decodeURIComponent(parsed.username),
  DB_PASSWORD: decodeURIComponent(parsed.password),
  DB_SCHEMA: 'lab',
  JWT_SECRET: 'secreto-de-pruebas-e2e-con-mas-de-32-caracteres',
  FRONTEND_URL: 'http://localhost:5173',
  TRUST_PROXY: '0',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_KEY: 'clave-ficticia',
  SUPABASE_BUCKET: 'pruebas',
});
