import { Module } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { ParamsExamsController } from './params_exams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParamsExam } from './entities/params_exam.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ExamsModule } from 'src/exams/exams.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParamsExam]),
            AuthModule,
            ExamsModule],
  controllers: [ParamsExamsController],
  providers: [ParamsExamsService],
  exports: [TypeOrmModule],
})
export class ParamsExamsModule {}
