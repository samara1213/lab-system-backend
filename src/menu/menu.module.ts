import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Menu } from './entities/menu.entity';
import { ExceptionModule } from '../exceptions/exception/exception.module';

@Module({
  imports: [TypeOrmModule.forFeature([Menu]),
    AuthModule,
   ExceptionModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [TypeOrmModule],
})
export class MenuModule { }
