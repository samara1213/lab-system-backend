import { PartialType } from '@nestjs/mapped-types';
import { CreateParamsExamDto } from './create-params_exam.dto';

export class UpdateParamsExamDto extends PartialType(CreateParamsExamDto) {}
