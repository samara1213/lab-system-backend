import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto';
import { Auth } from './decorators/auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // limite de intentos por IP para evitar ataques de fuerza bruta
  @Post('/login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('/changePassword')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }

  @Post('/forgot-password')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('/reset-password')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // sesion actual: usuario, laboratorio, permisos y menu
  @Get('/me')
  @Auth()
  me(@GetUser() user: User) {
    return this.authService.me(user);
  }

  @Get('/refreshToken')
  @Auth()
  refresToken(@GetUser() user: User) {
    return this.authService.refresToken(user);
  }

  @Get('/users')
  @Auth()
  @RequirePermission('users:view')
  findUsers(@Query() findUsersDto: FindUsersDto, @GetUser() user: User) {
    return this.authService.findUsers(user, findUsersDto.laboratory);
  }

  @Post('/register')
  @Auth()
  @RequirePermission('users:create')
  create(@Body() createUserDto: CreateUserDto, @GetUser() user: User) {
    return this.authService.create(createUserDto, user);
  }

  @Patch(':id/status')
  @Auth()
  @RequirePermission('users:update')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeUserStatusDto: ChangeUserStatusDto,
    @GetUser() user: User,
  ) {
    return this.authService.changeStatus(id, changeUserStatusDto, user);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @Auth()
  @RequirePermission('users:update')
  resetPasswordByAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.authService.resetPasswordByAdmin(id, user);
  }

  @Patch(':id')
  @Auth()
  @RequirePermission('users:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: User,
  ) {
    return this.authService.update(id, updateUserDto, user);
  }

  // compatibilidad con el frontend anterior (listaba por laboratorio): quitar en la Fase 7
  @Get(':laboratoryId')
  @Auth()
  @RequirePermission('users:view')
  findUsersByLaboratory(
    @Param('laboratoryId', ParseUUIDPipe) laboratoryId: string,
    @GetUser() user: User,
  ) {
    return this.authService.findUsers(user, laboratoryId);
  }
}
