import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/**
 * Configuracion comun de la aplicacion. La usan main.ts y las pruebas e2e
 * para que se comporten igual que en produccion
 * @param app instancia de la aplicacion Nest
 */
export function configureApp(app: NestExpressApplication) {

  const logger = new Logger('Bootstrap');

  // Railway pone un proxy delante: sin esto todas las peticiones tendrian la IP
  // del proxy y el limite de intentos del login seria compartido por todos
  const trustProxy = Number(process.env.TRUST_PROXY ?? 1);
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || process.env.TRUST_PROXY === '') {
    logger.warn('TRUST_PROXY debe ser un entero >= 0; se usa 1');
    app.set('trust proxy', 1);
  } else {
    app.set('trust proxy', trustProxy);
  }

  // cabeceras de seguridad HTTP
  app.use(helmet());

  app.setGlobalPrefix('api');

  // CORS solo para los origenes del frontend (FRONTEND_URL, separados por coma)
  const allowedOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    // el navegador envia el Origin sin barra final y en minusculas
    .map(origin => origin.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins });
  } else {
    logger.warn('FRONTEND_URL no está configurada: CORS abierto a cualquier origen');
    app.enableCors();
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  return app;
}
