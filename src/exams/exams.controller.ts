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
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Auth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @RequirePermission('exams:create')
  @Post()
  create(@GetUser() user: User, @Body() createExamDto: CreateExamDto) {
    return this.examsService.create(
      resolveLaboratoryId(user, createExamDto.laboratory),
      createExamDto,
    );
  }

  // examenes del laboratorio del usuario (la pantalla de crear orden tambien los lista)
  @RequirePermission('exams:view', 'orders:create')
  @Get()
  findAll(@GetUser() user: User) {
    return this.examsService.findAllByLaboratory(resolveLaboratoryId(user));
  }

  // compatibilidad con el frontend anterior (laboratorio en la url): quitar en la Fase 7
  @RequirePermission('exams:view', 'orders:create')
  @Get('/companies/:id')
  findAllByCompany(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) idCompany: string,
  ) {
    return this.examsService.findAllByLaboratory(
      resolveLaboratoryId(user, idCompany),
    );
  }

  @RequirePermission('exams:view')
  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.findOne(id, resolveLaboratoryId(user));
  }

  @RequirePermission('exams:update')
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
