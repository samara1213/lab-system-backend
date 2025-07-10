import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { AllianceService } from './alliance.service';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { UpdateAllianceDto } from './dto/update-alliance.dto';
import { Auth } from '../auth/decorators/auth.decorator';

@Auth()
@Controller('alliance')
export class AllianceController {
  constructor(private readonly allianceService: AllianceService) {}

  @Post()
  create(@Body() createAllianceDto: CreateAllianceDto) {
    return this.allianceService.create(createAllianceDto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateAllianceDto: UpdateAllianceDto) {
    return this.allianceService.update(id, updateAllianceDto);
  }

  @Get('laboratory/:lab_id')
  findAllByLaboratory(@Param('lab_id', ParseUUIDPipe) lab_id: string) {
    return this.allianceService.findAllByLaboratory(lab_id);
  }
}
