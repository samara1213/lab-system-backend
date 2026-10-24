import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  await app.listen(process.env.PORT);
  logger.log(`Servidor corriendo en el puerto: ${process.env.PORT}`);

}
bootstrap();
