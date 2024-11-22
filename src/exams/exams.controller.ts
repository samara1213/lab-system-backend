import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/auth/entities/user.entity';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Auth()
  create(@Body() createExamDto: CreateExamDto,
  @GetUser() user: User) {

    return this.examsService.create(createExamDto, user);

  }

  @Get('/companies/:id')
  @Auth()
  findAllByCompany(@Param('id', ParseUUIDPipe) idCompany: string) {

    return this.examsService.findAllByCompany(idCompany);

  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateExamDto: UpdateExamDto,
  @GetUser() user: User) {

    return this.examsService.update(id, updateExamDto, user);
  
  }

}
