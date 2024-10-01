import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Tree } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { EmailsService } from 'src/emails/emails.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {

  constructor(

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailsService
  ) { }

  /**
   * funcion que se encarga de realizar la vcreacion de un nuevo usuario
   * @param createUserDto datos de ususario
   * @returns  respuesta de la creacion
   */
  async create(createUserDto: CreateUserDto) {

    try {

      /**preparamos la data a insertar desctruramos el objecto y 
       * agregamos la contraseña cifrada
       * aTf#t4#U5hHS
      */
      // Obtenemos la contraseña
      const password = this.handleGeneratePassword();

      const user = this.userRepository.create({
        ...createUserDto,
        use_contrasena: bcrypt.hashSync(password, 10),
      })

      // se guarda el usuario en la base de datos
      await this.userRepository.save(user);

      // enviamos el correo de notificacion con la contraseña
      await this.emailService.sendMailWelcome(
        user.use_correo,
        `${user.use_primer_nombre} ${user.use_primer_apellido}`,
        password);

      return {

        'message': 'usuario creado correctamente'
      }

    } catch (error) {

      this.handleExceptions(error)
    }
  }


  /**
   * 
   * @param loginUserDto 
   * @returns 
   */
  async login(loginUserDto: LoginUserDto) {

    // se desectrura el correo y contraseña
    const { use_correo, use_contrasena } = loginUserDto;

    // de esta forma consultamos el ussuario por el correo y solo regresamos el email
    //y la contraseña
    const user = await this.userRepository.findOne({
      where: { use_correo },
      select: { use_correo: true, use_contrasena: true, use_estado: true, use_primer_ingreso: true, use_id: true },
      relations: ['company'],
    })

    // validamos que el ussuario exista
    if (!user) throw new UnauthorizedException('El usuario o contraseña incorrecto');

    // si el usuariuo existe vaidamos la contraseña sea valida
    if (!bcrypt.compareSync(use_contrasena, user.use_contrasena)) throw new UnauthorizedException('El usuario o contraseña incorrecto');

    if (user.use_estado !== 'ACTIVO') throw new UnauthorizedException('El usuario o contraseña incorrecto');

    // eliminamos la contraseña de la respuesta
    delete user.use_contrasena;

    return {

      data: { ...user },
      token: this.getJwtToken({ use_id: user.use_id }),

    }
  }

  /**
   * funcion que se encarga de realizar el cambio de contrasela de un ussuario
   * @param changePassword   Datos del ussuario a cambiar contraseña
   * @returns 
   */
  async changePassword(changePasswordDto: ChangePasswordDto) {

    try {
  
      // se desestructura el objecto
      const { use_correo, use_old_contrasena, use_new_contrasena } = changePasswordDto;

      // consutamos el ususario si existe para verificar si la contraseña es valida
      const user = await this.userRepository.findOne({
        where: { use_correo },
        select: { use_contrasena: true, use_id: true},
        relations: ['company']
      });

      // validamos si existe el ususario
      if (!user) throw new UnauthorizedException('El usuario o contraseña incorrecto');

      // si el usuariuo existe vaidamos la contraseña sea valida
      if (!bcrypt.compareSync(use_old_contrasena, user.use_contrasena)) throw new UnauthorizedException('El usuario o contraseña incorrecto');

      // se prepara el ussuario a modificar
      const updateUser = await this.userRepository.preload({
        use_id: user.use_id,      
        use_contrasena: bcrypt.hashSync(use_new_contrasena, 10),
      });

      // guardamos los datos del ussuario
      await this.userRepository.save(updateUser);

      return {

        'message': 'Su cambio de contraseña fue exitoso'
      }

    } catch (error) {

      this.handleExceptions(error);
    }
  }

  /**
   * funcion que se encarga de hacer el refresco de un token
   * @param user Datos del ussuario
   * @returns 
   */
  async refresToken(user: User) {

    return {
      data: { ...user },
      token: this.getJwtToken({ use_id: user.use_id }),
    };    
  }


  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }


  /**
   * funcion que se encarga de regresra el token 
   * @param payload datos para el token
   * @returns  token generado
   */
  private getJwtToken(payload: JwtPayload) {

    const token = this.jwtService.sign(payload);

    return token;


  }

  /**
   * Funcion que se encarga de generar una contraseña dinamica
   */
  private handleGeneratePassword() {

    // Caracteres permitidos en la contraseña
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';

    // Generar una clave aleatoria
    const password = Array.from(crypto.randomBytes(12))
      .map(byte => chars[byte % chars.length])
      .join('');

    console.log('contraseña' + password);

    return password;

  }

  /**
   * Metodo que se encarga de validar cualquier  tipo de error 
   * @param error generado
  */
  private handleExceptions(error: any) {

    //this.logger.error(error)
    console.log(error)
    if (23505 === +error.code) throw new BadRequestException('El correo ingresado ya existe');

    // error no encontrado
    throw new InternalServerErrorException('Error del sistema')
  }
}
