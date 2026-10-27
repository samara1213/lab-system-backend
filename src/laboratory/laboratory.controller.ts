import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LaboratoryService } from './laboratory.service';
import { CreateLaboratoryDto } from './dto/create-laboratory.dto';
import { UpdateLaboratoryDto } from './dto/update-laboratory.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

// modulo global: solo el super administrador tiene estos permisos
@Auth()
@RequirePermission('laboratories:view')
@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Post()
  @RequirePermission('laboratories:create')
  create(@Body() createLaboratoryDto: CreateLaboratoryDto) {
    return this.laboratoryService.create(createLaboratoryDto);
  }

  @Get()
  findAll() {
    return this.laboratoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.laboratoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('laboratories:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLaboratoryDto: UpdateLaboratoryDto,
  ) {
    return this.laboratoryService.update(id, updateLaboratoryDto);
  }
}
