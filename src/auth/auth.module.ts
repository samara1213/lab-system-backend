import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt-strategy';
import { EmailsModule } from 'src/emails/emails.module';
import { RoleModule } from 'src/role/role.module';
import { LaboratoryModule } from 'src/laboratory/laboratory.module';

@Module({
  imports: [    
  TypeOrmModule.forFeature([User]),
  ConfigModule,
  EmailsModule,
  forwardRef(() => RoleModule),
  forwardRef(() => LaboratoryModule),
  PassportModule.register({ defaultStrategy: 'jwt'}),
  JwtModule.registerAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {

      return {
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: '2h'
        }
      }
    }
  }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [TypeOrmModule, JwtStrategy, PassportModule, JwtModule]
})
export class AuthModule {}
