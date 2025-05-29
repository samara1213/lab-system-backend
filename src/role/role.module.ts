import { forwardRef, Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Role } from './entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role]),
    forwardRef(() => AuthModule)],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [TypeOrmModule],
})
export class RoleModule { }
