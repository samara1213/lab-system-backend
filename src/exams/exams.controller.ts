import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Auth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(@Body() createExamDto: CreateExamDto ) {

    return this.examsService.create(createExamDto);

  }

  @Get('/companies/:id')
  findAllByCompany(@Param('id', ParseUUIDPipe) idCompany: string) {

    return this.examsService.findAllByLaboratory(idCompany);

  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateExamDto: UpdateExamDto) {

    return this.examsService.update(id, updateExamDto);
  
  }

}
