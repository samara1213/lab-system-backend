import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { AllianceService } from './alliance.service';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { UpdateAllianceDto } from './dto/update-alliance.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { resolveLaboratoryId } from '../auth/helpers/laboratory-access.helper';

@Auth()
@Controller('alliance')
export class AllianceController {
  constructor(private readonly allianceService: AllianceService) {}

  @Post()
  create(@GetUser() user: User, @Body() createAllianceDto: CreateAllianceDto) {
    return this.allianceService.create(resolveLaboratoryId(user, createAllianceDto.ali_laboratory_id), createAllianceDto);
  }

  @Patch(':id')
  update(@GetUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() updateAllianceDto: UpdateAllianceDto) {
    return this.allianceService.update(id, resolveLaboratoryId(user, updateAllianceDto.ali_laboratory_id), updateAllianceDto);
  }

  @Get('laboratory/:lab_id')
  findAllByLaboratory(@GetUser() user: User, @Param('lab_id', ParseUUIDPipe) lab_id: string) {
    return this.allianceService.findAllByLaboratory(resolveLaboratoryId(user, lab_id));
  }
}
