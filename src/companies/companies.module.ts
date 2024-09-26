import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]),
  AuthModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [TypeOrmModule],
})
export class CompaniesModule {}
