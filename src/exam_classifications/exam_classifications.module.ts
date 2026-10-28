import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamClassificationsService } from './exam_classifications.service';
import { ExamClassificationsController } from './exam_classifications.controller';
import { ExamClassification } from './entities/exam_classification.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { AuthModule } from '../auth/auth.module';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamClassification, Exam, Laboratory]),
    AuthModule,
    ExceptionModule,
  ],
  controllers: [ExamClassificationsController],
  providers: [ExamClassificationsService],
  exports: [TypeOrmModule],
})
export class ExamClassificationsModule {}
