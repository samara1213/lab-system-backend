import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ParamsExamsService } from './params_exams.service';
import { CreateParamsExamDto } from './dto/create-params_exam.dto';
import { UpdateParamsExamDto } from './dto/update-params_exam.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Auth()
@Controller('params-exams')
export class ParamsExamsController {
  constructor(private readonly paramsExamsService: ParamsExamsService) {}

  @RequirePermission('exams:create', 'exams:update')
  @Post()
  create(
    @GetUser() user: User,
    @Body() createParamsExamDto: CreateParamsExamDto,
  ) {
    return this.paramsExamsService.create(
      resolveLaboratoryId(user),
      createParamsExamDto,
    );
  }

  @RequirePermission('exams:update')
  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParamsExamDto: UpdateParamsExamDto,
  ) {
    return this.paramsExamsService.update(
      id,
      resolveLaboratoryId(user),
      updateParamsExamDto,
    );
  }

  @RequirePermission('exams:view', 'results:view')
  @Get('exam/:exa_id')
  async findByExamId(
    @GetUser() user: User,
    @Param('exa_id', ParseUUIDPipe) exa_id: string,
  ) {
    return this.paramsExamsService.findByExamId(
      exa_id,
      resolveLaboratoryId(user),
    );
  }
}
