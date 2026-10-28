import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ExamClassificationsService } from './exam_classifications.service';
import { CreateExamClassificationDto } from './dto/create-exam_classification.dto';
import { UpdateExamClassificationDto } from './dto/update-exam_classification.dto';
import { FindExamClassificationsDto } from './dto/find-exam_classifications.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

// las clasificaciones son parte del catálogo de exámenes (mismo módulo de permisos)
@Auth()
@Controller('exam-classifications')
export class ExamClassificationsController {
  constructor(
    private readonly classificationsService: ExamClassificationsService,
  ) {}

  @RequirePermission('exams:view')
  @Get()
  findAll(@GetUser() user: User, @Query() query: FindExamClassificationsDto) {
    return this.classificationsService.findAll(user, query.laboratory);
  }

  @RequirePermission('exams:create')
  @Post()
  create(@GetUser() user: User, @Body() dto: CreateExamClassificationDto) {
    return this.classificationsService.create(user, dto);
  }

  @RequirePermission('exams:update')
  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamClassificationDto,
  ) {
    return this.classificationsService.update(user, id, dto);
  }
}
