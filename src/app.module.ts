import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

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
      synchronize: true
    }),    
    CompaniesModule, AuthModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
