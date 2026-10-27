import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  Query,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FindRolesDto } from './dto/find-roles.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Auth()
@RequirePermission('roles:view')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermission('roles:create')
  create(@Body() createRoleDto: CreateRoleDto, @GetUser() user: User) {
    return this.roleService.create(createRoleDto, user);
  }

  // la pantalla de usuarios tambien lista los roles para asignarlos
  @Get()
  @RequirePermission('roles:view', 'users:create', 'users:update')
  findAll(@Query() findRolesDto: FindRolesDto, @GetUser() user: User) {
    return this.roleService.findAll(user, findRolesDto.laboratory);
  }

  // catalogo de modulos para la matriz de permisos
  @Get('modules')
  findModules(@GetUser() user: User) {
    return this.roleService.findModules(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.roleService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('roles:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @GetUser() user: User,
  ) {
    return this.roleService.update(id, updateRoleDto, user);
  }

  @Delete(':id')
  @RequirePermission('roles:delete')
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.roleService.remove(id, user);
  }
}
