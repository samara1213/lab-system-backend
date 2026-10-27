import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';

@Auth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(@GetUser() user: User, @Body() createExamDto: CreateExamDto) {
    return this.examsService.create(
      resolveLaboratoryId(user, createExamDto.laboratory),
      createExamDto,
    );
  }

  @Get('/companies/:id')
  findAllByCompany(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) idCompany: string,
  ) {
    return this.examsService.findAllByLaboratory(
      resolveLaboratoryId(user, idCompany),
    );
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findOne(id, resolveLaboratoryId(user));
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExamDto: UpdateExamDto,
  ) {
    return this.examsService.update(
      id,
      resolveLaboratoryId(user, updateExamDto.laboratory),
      updateExamDto,
    );
  }
}
