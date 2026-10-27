import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MoveMenuDto } from './dto/move-menu.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

// modulo global: solo el super administrador tiene estos permisos
@Auth()
@RequirePermission('menus:view')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @RequirePermission('menus:create')
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Get()
  findAll() {
    return this.menuService.findAll();
  }

  @Patch(':id/move')
  @RequirePermission('menus:update')
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveMenuDto: MoveMenuDto,
  ) {
    return this.menuService.move(id, moveMenuDto.direction);
  }

  @Patch(':id')
  @RequirePermission('menus:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Delete(':id')
  @RequirePermission('menus:delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.remove(id);
  }
}
