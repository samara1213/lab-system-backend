import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto';
import { Auth } from './decorators/auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { RequireMenu } from './decorators/require-menu.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  @Auth()
  @RequireMenu('/users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

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

  @Get('/refreshToken')
  @Auth()
  refresToken(@GetUser() user: User) {
    return this.authService.refresToken(user);
  }

  @Get(':laboratoryId')
  @Auth()
  @RequireMenu('/users')
  findUsersByLaboratory(@Param('laboratoryId', ParseUUIDPipe) laboratoryId: string) {

    return this.authService.findUsersByLaboratory(laboratoryId);
  }

  @Patch(':id')
  @Auth()
  @RequireMenu('/users')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(id, updateAuthDto);
  }

}
