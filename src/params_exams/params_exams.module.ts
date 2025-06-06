import { Module } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { ParamsExamsController } from './params_exams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { AuthModule } from '../auth/auth.module';
import { ExamsModule } from '../exams/exams.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParamsExam]),
            AuthModule,
            ExamsModule,
            ExceptionModule],
  controllers: [ParamsExamsController],
  providers: [ParamsExamsService],
  exports: [TypeOrmModule],
})
export class ParamsExamsModule {}
