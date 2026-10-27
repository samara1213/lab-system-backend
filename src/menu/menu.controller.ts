import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequireMenu } from '../auth/decorators/require-menu.decorator';

// por defecto todo endpoint exige la opcion de menu; cada metodo puede ampliarla
@Auth()
@RequireMenu('/menus')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @RequireMenu('/menus')
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  // la pantalla de roles tambien lista los menus para asignarlos
  @Get()
  @RequireMenu('/menus', '/roles')
  findAll() {
    return this.menuService.findAll();
  }

  @Patch(':id')
  @RequireMenu('/menus')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMenuDto: UpdateMenuDto,
  ) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Get(':level')
  @RequireMenu('/menus')
  getMenuParentByLevel(@Param('level', ParseIntPipe) level: number) {
    return this.menuService.getMenuParentByLevel(level);
  }
}
