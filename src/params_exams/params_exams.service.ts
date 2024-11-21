import { Injectable } from '@nestjs/common';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';

@Injectable()
export class ParamsExamsService {
  create(createParamsExamDto: CreateParamsExamDto) {
    return 'This action adds a new paramsExam';
  }

  findAll() {
    return `This action returns all paramsExams`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paramsExam`;
  }

  update(id: number, updateParamsExamDto: UpdateParamsExamDto) {
    return `This action updates a #${id} paramsExam`;
  }

  remove(id: number) {
    return `This action removes a #${id} paramsExam`;
  }
}
