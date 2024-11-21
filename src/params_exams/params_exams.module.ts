import { Module } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { ParamsExamsController } from './params_exams.controller';

@Module({
  controllers: [ParamsExamsController],
  providers: [ParamsExamsService],
})
export class ParamsExamsModule {}
