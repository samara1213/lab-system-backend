import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { AuthModule } from '../auth/auth.module';
import { LaboratoryModule } from '../laboratory/laboratory.module';
import { AllianceModule } from '../alliance/alliance.module';
import { ParamsExam } from '../params_exams/entities/params_exam.entity';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exam]),
            AuthModule,
            LaboratoryModule,
            AllianceModule,
            ParamsExam,
            ExceptionModule
           ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [TypeOrmModule],
})
export class ExamsModule {}
