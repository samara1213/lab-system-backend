import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { describeError } from '../exceptions/exception/safe-error.helper';
import { User } from './entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { EmailsService } from '../emails/emails.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RoleService } from '../role/role.service';
import { PermissionsService } from '../permissions/permissions.service';
import { isSystemUser } from '../permissions/permissions.helper';
import {
  NOT_FOUND_MESSAGE,
  resolveManagedLaboratoryId,
} from './helpers/laboratory-access.helper';

// vigencia del enlace de recuperacion de contraseña
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// relaciones que necesita la sesion (laboratorio y permisos del rol)
const SESSION_RELATIONS = {
  laboratory: true,
  role: { permissions: { module: true } },
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailsService,
    private readonly roleService: RoleService,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Crea un usuario con una contraseña aleatoria que se envia por correo.
   * El laboratorio es el del administrador (el super administrador puede indicar otro)
   * @param createUserDto datos del usuario
   * @param actor usuario autenticado
   * @returns respuesta de la creacion
   */
  async create(createUserDto: CreateUserDto, actor: User) {
    try {
      const lab_id = resolveManagedLaboratoryId(
        actor,
        createUserDto.laboratory,
      );
      await this.roleService.assertAssignable(
        createUserDto.role,
        actor,
        lab_id,
      );

      const password = this.handleGeneratePassword();
      const { role, laboratory: _laboratory, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        use_correo: userData.use_correo.trim(),
        use_contrasena: bcrypt.hashSync(password, 10),
        use_primer_ingreso: true,
        role: { rol_id: role },
        laboratory: { lab_id },
      });

      await this.userRepository.save(user);

      // correo de bienvenida con la contraseña temporal
      await this.emailService.sendMailWelcome(
        user.use_correo,
        `${user.use_primer_nombre} ${user.use_primer_apellido}`,
        password,
      );

      return {
        status: 201,
        message: 'El registro de usuario se ha creado correctamente',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Inicia sesion: valida correo y contraseña y devuelve la sesion (usuario,
   * laboratorio, permisos y menu) con el token
   * @param loginUserDto credenciales
   * @returns sesion y token
   */
  async login(loginUserDto: LoginUserDto) {
    const { use_correo, use_contrasena } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { use_correo: use_correo.trim() },
      select: {
        use_id: true,
        use_correo: true,
        use_contrasena: true,
        use_estado: true,
        use_primer_ingreso: true,
        use_primer_nombre: true,
        use_primer_apellido: true,
        use_documento: true,
        use_telefono: true,
        use_ultimo_ingreso: true,
      },
      relations: SESSION_RELATIONS,
    });

    // mismo mensaje en todos los casos para no revelar si el correo existe
    if (
      !user ||
      !bcrypt.compareSync(use_contrasena, user.use_contrasena ?? '') ||
      user.use_estado !== 'ACTIVO'
    ) {
      throw new UnauthorizedException('El usuario o contraseña incorrecto');
    }

    delete user.use_contrasena;
    await this.userRepository.update(
      { use_id: user.use_id },
      { use_ultimo_ingreso: new Date() },
    );

    return {
      data: await this.permissionsService.buildSession(user),
      token: this.getJwtToken({ use_id: user.use_id }),
    };
  }

  /**
   * Sesion actual del usuario autenticado (menu y permisos al dia)
   * @param user usuario autenticado
   */
  async me(user: User) {
    return {
      status: 200,
      data: await this.permissionsService.buildSession(user),
    };
  }

  /**
   * Cambia la contraseña con la anterior (primer ingreso o cambio voluntario)
   * @param changePasswordDto correo, contraseña anterior y nueva
   * @returns respuesta del proceso
   */
  async changePassword(changePasswordDto: ChangePasswordDto) {
    try {
      const { use_correo, use_old_contrasena, use_new_contrasena } =
        changePasswordDto;

      const user = await this.userRepository.findOne({
        where: { use_correo: use_correo.trim() },
        select: { use_contrasena: true, use_id: true, use_estado: true },
      });

      // 400 y no 401: el interceptor del front trata un 401 como sesion expirada
      if (
        !user ||
        user.use_estado !== 'ACTIVO' ||
        !bcrypt.compareSync(use_old_contrasena, user.use_contrasena ?? '')
      ) {
        throw new BadRequestException('El usuario o contraseña incorrecto');
      }
      if (use_old_contrasena === use_new_contrasena)
        throw new BadRequestException(
          'La contraseña nueva debe ser diferente a la anterior',
        );

      await this.userRepository.update(
        { use_id: user.use_id },
        {
          use_contrasena: bcrypt.hashSync(use_new_contrasena, 10),
          use_primer_ingreso: false,
        },
      );

      return {
        status: 200,
        message: 'La contraseña se ha cambiado correctamente',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Solicitud de recuperacion: si el correo es de un usuario activo, envia un
   * enlace de un solo uso que vence en 30 minutos. La respuesta es la misma
   * exista o no el correo
   * @param forgotPasswordDto correo del usuario
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const response = {
      status: 200,
      message:
        'Si el correo está registrado, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.',
    };

    try {
      const user = await this.userRepository.findOne({
        where: {
          use_correo: forgotPasswordDto.use_correo.trim(),
          use_estado: 'ACTIVO',
        },
      });
      if (!user) return response;

      const baseUrl = (process.env.FRONTEND_URL ?? '')
        .split(',')[0]
        .trim()
        .replace(/\/+$/, '');
      if (!baseUrl) {
        this.logger.warn(
          'FRONTEND_URL no está configurada: no se puede enviar el enlace de recuperación',
        );
        return response;
      }

      // solo se guarda el hash del token; las solicitudes anteriores sin usar quedan invalidas
      const token = crypto.randomBytes(32).toString('hex');
      await this.passwordResetRepository.update(
        { user: { use_id: user.use_id }, pre_used_at: IsNull() },
        { pre_used_at: new Date() },
      );
      await this.passwordResetRepository.save({
        user: { use_id: user.use_id },
        pre_token_hash: this.hashToken(token),
        pre_expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      await this.emailService.sendMailPasswordReset(
        user.use_correo,
        `${user.use_primer_nombre ?? ''} ${user.use_primer_apellido ?? ''}`.trim(),
        `${baseUrl}/reset-password?token=${token}`,
      );

      return response;
    } catch (error) {
      // el detalle queda en el log; al cliente siempre la misma respuesta
      this.logger.error(describeError(error), error?.stack);
      return response;
    }
  }

  /**
   * Crea la contraseña nueva con el token del correo de recuperacion
   * @param resetPasswordDto token y contraseña nueva
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const reset = await this.passwordResetRepository.findOne({
        where: {
          pre_token_hash: this.hashToken(resetPasswordDto.token),
          pre_used_at: IsNull(),
          pre_expires_at: MoreThan(new Date()),
        },
        relations: { user: true },
      });

      if (!reset || reset.user.use_estado !== 'ACTIVO') {
        throw new BadRequestException(
          'El enlace no es válido o ya venció. Solicita uno nuevo',
        );
      }

      await this.passwordResetRepository.update(
        { pre_id: reset.pre_id },
        { pre_used_at: new Date() },
      );
      await this.userRepository.update(
        { use_id: reset.user.use_id },
        {
          use_contrasena: bcrypt.hashSync(
            resetPasswordDto.use_new_contrasena,
            10,
          ),
          use_primer_ingreso: false,
        },
      );

      return {
        status: 200,
        message:
          'La contraseña se ha cambiado correctamente. Ya puedes ingresar',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Reemite el token y devuelve la sesion actualizada
   * @param user usuario autenticado
   */
  async refresToken(user: User) {
    return {
      data: await this.permissionsService.buildSession(user),
      token: this.getJwtToken({ use_id: user.use_id }),
    };
  }

  /**
   * Usuarios del laboratorio que administra el usuario autenticado
   * @param actor usuario autenticado
   * @param labId laboratorio a consultar (solo super administrador)
   * @returns lista de usuarios con su rol
   */
  async findUsers(actor: User, labId?: string) {
    try {
      const lab_id = resolveManagedLaboratoryId(actor, labId);

      const users = await this.userRepository.find({
        where: { laboratory: { lab_id } },
        relations: { role: true },
        order: { use_primer_nombre: 'ASC', use_primer_apellido: 'ASC' },
      });

      return {
        status: 200,
        data: users.map((user) => ({
          use_id: user.use_id,
          use_primer_nombre: user.use_primer_nombre,
          use_primer_apellido: user.use_primer_apellido,
          use_correo: user.use_correo,
          use_documento: user.use_documento,
          use_telefono: user.use_telefono,
          use_estado: user.use_estado,
          use_primer_ingreso: user.use_primer_ingreso,
          use_ultimo_ingreso: user.use_ultimo_ingreso,
          use_fecha_creacion: user.use_fecha_creacion,
          role: user.role
            ? {
                rol_id: user.role.rol_id,
                rol_nombre: user.role.rol_nombre,
                rol_is_system: user.role.rol_is_system,
              }
            : null,
        })),
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Actualiza los datos de un usuario del laboratorio. El rol se valida igual
   * que al crear; nadie cambia su propio rol
   * @param id id del usuario
   * @param updateUserDto datos a actualizar
   * @param actor usuario autenticado
   */
  async update(id: string, updateUserDto: UpdateUserDto, actor: User) {
    try {
      const user = await this.findManaged(id, actor);
      const { role, laboratory, ...userData } = updateUserDto;

      if (laboratory && laboratory !== user.laboratory?.lab_id) {
        if (!isSystemUser(actor))
          throw new ForbiddenException(
            'Solo el super administrador cambia el laboratorio de un usuario',
          );
      }
      const targetLabId = laboratory ?? user.laboratory?.lab_id;

      if (role && role !== user.role?.rol_id) {
        if (id === actor.use_id)
          throw new ForbiddenException('No puede cambiar su propio rol');
        await this.roleService.assertAssignable(role, actor, targetLabId);
      } else if (laboratory && user.role) {
        // al cambiar de laboratorio, el rol actual debe valer para el nuevo
        await this.roleService.assertAssignable(
          user.role.rol_id,
          actor,
          targetLabId,
        );
      }

      await this.userRepository.update(
        { use_id: id },
        {
          ...userData,
          ...(userData.use_correo
            ? { use_correo: userData.use_correo.trim() }
            : {}),
          ...(role ? { role: { rol_id: role } } : {}),
          ...(laboratory ? { laboratory: { lab_id: laboratory } } : {}),
        },
      );

      return {
        status: 200,
        message: 'Usuario actualizado correctamente',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Activa o desactiva un usuario (un usuario inactivo no puede ingresar y su
   * sesion deja de valer en la siguiente peticion)
   * @param id id del usuario
   * @param changeUserStatusDto estado nuevo
   * @param actor usuario autenticado
   */
  async changeStatus(
    id: string,
    changeUserStatusDto: ChangeUserStatusDto,
    actor: User,
  ) {
    try {
      if (id === actor.use_id)
        throw new ForbiddenException(
          'No puede cambiar el estado de su propio usuario',
        );
      await this.findManaged(id, actor);

      await this.userRepository.update(
        { use_id: id },
        { use_estado: changeUserStatusDto.use_estado },
      );

      return {
        status: 200,
        message:
          changeUserStatusDto.use_estado === 'ACTIVO'
            ? 'Usuario activado'
            : 'Usuario desactivado',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * El administrador asigna una contraseña temporal y la envia por correo; el
   * usuario debe cambiarla al ingresar
   * @param id id del usuario
   * @param actor usuario autenticado
   */
  async resetPasswordByAdmin(id: string, actor: User) {
    try {
      const user = await this.findManaged(id, actor);
      const password = this.handleGeneratePassword();

      await this.userRepository.update(
        { use_id: id },
        {
          use_contrasena: bcrypt.hashSync(password, 10),
          use_primer_ingreso: true,
        },
      );

      await this.emailService.sendMailTemporaryPassword(
        user.use_correo,
        `${user.use_primer_nombre ?? ''} ${user.use_primer_apellido ?? ''}`.trim(),
        password,
      );

      return {
        status: 200,
        message: 'Se envió una contraseña temporal al correo del usuario',
      };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  /**
   * Busca un usuario que el actor puede administrar: de su laboratorio (el super
   * administrador, cualquiera). Si no, 404. Nadie que no sea del sistema
   * administra a un usuario con rol del sistema
   */
  private async findManaged(id: string, actor: User) {
    const user = await this.userRepository.findOne({
      where: { use_id: id },
      relations: { laboratory: true, role: true },
    });

    if (!user) throw new NotFoundException(NOT_FOUND_MESSAGE);
    if (isSystemUser(actor)) return user;

    if (user.laboratory?.lab_id !== resolveManagedLaboratoryId(actor))
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    if (user.role?.rol_is_system)
      throw new ForbiddenException(
        'No puede modificar a un super administrador',
      );

    return user;
  }

  /**
   * Firma el token de sesion
   * @param payload datos para el token
   */
  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  /**
   * Hash del token de recuperacion (solo el hash se guarda en la base)
   */
  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Genera una contraseña aleatoria de 12 caracteres
   */
  private handleGeneratePassword() {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';

    return Array.from(crypto.randomBytes(12))
      .map((byte) => chars[byte % chars.length])
      .join('');
  }

  /**
   * Metodo que se encarga de validar cualquier  tipo de error
   * @param error generado
   */
  private handleExceptions(error: any) {
    // las excepciones HTTP ya construidas (401, 404...) se propagan sin cambios
    if (error instanceof HttpException) throw error;

    // se registra sin parametros de la consulta (pueden traer correos o hashes)
    this.logger.error(describeError(error), error?.stack);
    if (23505 === +error.code)
      throw new BadRequestException('El correo ingresado ya existe');

    throw new InternalServerErrorException('Error del sistema');
  }
}
