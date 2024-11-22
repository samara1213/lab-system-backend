import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exam]),
            AuthModule
           ],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [TypeOrmModule],
})
export class ExamsModule {}
