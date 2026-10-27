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
import { RequireMenu } from '../auth/decorators/require-menu.decorator';

// por defecto todo endpoint exige la opcion de menu; cada metodo puede ampliarla
@Auth()
@RequireMenu('/laboratories')
@Controller('laboratory')
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Post()
  @RequireMenu('/laboratories')
  create(@Body() createLaboratoryDto: CreateLaboratoryDto) {
    return this.laboratoryService.create(createLaboratoryDto);
  }

  // la pantalla de usuarios tambien lista los laboratorios para filtrar
  @Get()
  @RequireMenu('/laboratories', '/users')
  findAll() {
    return this.laboratoryService.findAll();
  }

  @Get(':id')
  @RequireMenu('/laboratories')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.laboratoryService.findOne(id);
  }

  @Patch(':id')
  @RequireMenu('/laboratories')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLaboratoryDto: UpdateLaboratoryDto,
  ) {
    return this.laboratoryService.update(id, updateLaboratoryDto);
  }
}
