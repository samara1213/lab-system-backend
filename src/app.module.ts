import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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


@Module({
  imports: [ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type:    'postgres',
      host:     process.env.DB_HOST,
      port:    +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      schema  : process.env.DB_SCHEMA,
      autoLoadEntities: true,
      synchronize: false
    }),    
    AuthModule, EmailsModule, CustomersModule, ExamsModule, ParamsExamsModule, LaboratoryModule, MenuModule, RoleModule, AllianceModule, OrdersModule, ResultsModule, ExceptionModule, PdfModule, StorageModule, 
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
