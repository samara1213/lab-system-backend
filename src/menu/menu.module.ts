import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Menu } from './entities/menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Menu]),
    AuthModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [TypeOrmModule],
})
export class MenuModule { }
