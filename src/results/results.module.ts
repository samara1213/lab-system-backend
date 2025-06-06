import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Result } from './entities/result.entity';
import { AuthModule } from '../auth/auth.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Result]),
            AuthModule,
            ExceptionModule], 
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [TypeOrmModule], 
})
export class ResultsModule {}
