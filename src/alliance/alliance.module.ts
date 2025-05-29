import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllianceService } from './alliance.service';
import { AllianceController } from './alliance.controller';
import { Alliance } from './entities/alliance.entity';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alliance]),
            LaboratoryModule],
  controllers: [AllianceController],
  providers: [AllianceService],
  exports: [TypeOrmModule],
})
export class AllianceModule {}
