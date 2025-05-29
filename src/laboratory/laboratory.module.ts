import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LaboratoryService } from './laboratory.service';
import { LaboratoryController } from './laboratory.controller';
import { Laboratory } from './entities/laboratory.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Laboratory]),
            forwardRef(() => AuthModule)],
  controllers: [LaboratoryController],
  providers: [LaboratoryService],
  exports: [TypeOrmModule],
})
export class LaboratoryModule {}
