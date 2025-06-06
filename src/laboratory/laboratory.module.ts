import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaboratoryService } from './laboratory.service';
import { LaboratoryController } from './laboratory.controller';
import { Laboratory } from './entities/laboratory.entity';
import { AuthModule } from '../auth/auth.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Laboratory]),
            forwardRef(() => AuthModule),
          ExceptionModule],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [TypeOrmModule],
})
export class LaboratoryModule {}
