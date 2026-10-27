import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';

@Auth()
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  create(@GetUser() user: User, @Body() createResultDto: CreateResultDto) {
    return this.resultsService.create(
      resolveLaboratoryId(user),
      createResultDto,
    );
  }

  @Get(':id')
  findOne(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.resultsService.findOne(id, resolveLaboratoryId(user));
  }

  @Patch(':id')
  update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResultDto: UpdateResultDto,
  ) {
    return this.resultsService.update(
      id,
      resolveLaboratoryId(user),
      updateResultDto,
    );
  }
}
