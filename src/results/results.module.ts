import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Result } from './entities/result.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Result]),
            AuthModule], 
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [TypeOrmModule], 
})
export class ResultsModule {}
