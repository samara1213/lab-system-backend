import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('params-exams')
export class ParamsExamsController {
  constructor(private readonly paramsExamsService: ParamsExamsService) {}

  @Post()
  @Auth()
  create(@Body() createParamsExamDto: CreateParamsExamDto,
         @GetUser() user: User) {
    return this.paramsExamsService.create(createParamsExamDto, user);
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
