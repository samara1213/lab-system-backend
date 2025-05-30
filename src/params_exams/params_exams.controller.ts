import { Controller, Post, Body, Patch, Param } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';

@Controller('params-exams')
export class ParamsExamsController {
  constructor(private readonly paramsExamsService: ParamsExamsService) {}

  @Post()
  create(@Body() createParamsExamDto: CreateParamsExamDto,
         @GetUser() user: User) {
    return this.paramsExamsService.create(createParamsExamDto);
  }  

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParamsExamDto: UpdateParamsExamDto,
         @GetUser() user: User) {
    return this.paramsExamsService.update(id, updateParamsExamDto);
  }

}
