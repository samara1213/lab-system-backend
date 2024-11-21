import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';

@Controller('params-exams')
export class ParamsExamsController {
  constructor(private readonly paramsExamsService: ParamsExamsService) {}

  @Post()
  create(@Body() createParamsExamDto: CreateParamsExamDto) {
    return this.paramsExamsService.create(createParamsExamDto);
  }

  @Get()
  findAll() {
    return this.paramsExamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paramsExamsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParamsExamDto: UpdateParamsExamDto) {
    return this.paramsExamsService.update(+id, updateParamsExamDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paramsExamsService.remove(+id);
  }
}
