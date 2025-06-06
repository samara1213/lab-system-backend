import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllianceService } from './alliance.service';
import { AllianceController } from './alliance.controller';
import { Alliance } from './entities/alliance.entity';
import { LaboratoryModule } from '../laboratory/laboratory.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alliance]),
            LaboratoryModule,
           ExceptionModule],
  controllers: [AllianceController],
  providers: [AllianceService],
  exports: [TypeOrmModule],
})
export class AllianceModule {}
