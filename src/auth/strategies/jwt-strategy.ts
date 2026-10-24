import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../entities/user.entity";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        configService: ConfigService
    ) {
        
        super({
            secretOrKey: configService.get('JWT_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        })
    }

    // si el token es valido consultamos el ussuario en la base de datos
    async validate(payalod: JwtPayload): Promise<User> {

        const { use_id } = payalod;

        // se carga el laboratorio (aislamiento de datos) y los menus del rol (permisos)
        const user = await this.userRepository.findOne({
            where: { use_id },
            relations: ['laboratory', 'role', 'role.menus'],
        });

        if (!user) throw new UnauthorizedException('el token sumistrado es invalido')

        if(user.use_estado !== 'ACTIVO') throw new UnauthorizedException('usuario no valido')

        return user;

    }
} 