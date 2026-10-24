import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { EmailsModule } from './emails/emails.module';
import { CustomersModule } from './customers/customers.module';
import { ExamsModule } from './exams/exams.module';
import { ParamsExamsModule } from './params_exams/params_exams.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { MenuModule } from './menu/menu.module';
import { RoleModule } from './role/role.module';
import { AllianceModule } from './alliance/alliance.module';
import { OrdersModule } from './orders/orders.module';
import { ResultsModule } from './results/results.module';
import { ExceptionModule } from './exceptions/exception/exception.module';
import { PdfModule } from './pdf/pdf.module';
import { StorageModule } from './storage/storage.module';
import { AttachedModule } from './attached/attached.module';
import { validateEnv } from './config/env.validation';
import { buildDataSourceOptions } from './database/database.config';


@Module({
  imports: [
    // valida las variables de entorno al arrancar
    ConfigModule.forRoot({ validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildDataSourceOptions(),
        autoLoadEntities: true,
      }),
    }),
    // limites de peticiones; solo se aplican donde se usa ThrottlerGuard (login y cambio de contraseña)
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 10 }],
      errorMessage: 'Demasiados intentos. Espere un minuto e intente de nuevo',
    }),
    AuthModule, EmailsModule, CustomersModule, ExamsModule, ParamsExamsModule, LaboratoryModule, MenuModule, RoleModule, AllianceModule, OrdersModule, ResultsModule, ExceptionModule, PdfModule, StorageModule, AttachedModule, 
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
