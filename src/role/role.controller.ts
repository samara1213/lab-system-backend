import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequireMenu } from '../auth/decorators/require-menu.decorator';

// por defecto todo endpoint exige la opcion de menu; cada metodo puede ampliarla
@Auth()
@RequireMenu('/roles')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequireMenu('/roles')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  // la pantalla de usuarios tambien lista los roles para asignarlos
  @Get()
  @RequireMenu('/roles', '/users')
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @RequireMenu('/roles')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequireMenu('/roles')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }
}
