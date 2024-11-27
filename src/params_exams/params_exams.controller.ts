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
  

  @Patch(':id')
  @Auth()
  update(@Param('id') id: string, @Body() updateParamsExamDto: UpdateParamsExamDto,
         @GetUser() user: User) {
    return this.paramsExamsService.update(id, updateParamsExamDto, user);
  }

  @Delete(':id')
  @Auth()
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.paramsExamsService.remove(id, user);
  }
}
