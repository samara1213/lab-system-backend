import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { templateEmailWelcom } from './templates/templateEmailWelcom';
import {
  ResultEmailData,
  templateEmailResult,
} from './templates/templateEmailResult';
import {
  templateEmailPasswordReset,
  templateEmailTemporaryPassword,
} from './templates/templateEmailPassword';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class EmailsService {
  private readonly logger = new Logger('EmailsService');

  private transporter: nodemailer.Transporter;

  // configuracion de parametros de envio de  correo
  constructor(private readonly exceptionService: ExceptionService) {
    this.transporter = nodemailer.createTransport({
      service: process.env.SERVICE_NOTIFICATION,
      auth: {
        user: process.env.USER_NOTIFICATION,
        pass: process.env.PASSWORD_NOTIFICATION,
      },
    });
  }

  /**
   * Funcion que se encarga de enviar un correo cuando se crea el usuario
   * @param to Correo del ussuario
   * @param nombre Nombre del usuario
   * @param password Contraseña asignada al usuario
   */
  async sendMailWelcome(to: string, nombre: string, password: string) {
    // reemplazamos los valores en la plantilla
    const htmlContentTemplate = templateEmailWelcom(nombre, to, password);

    const mailOptions = {
      from: process.env.USER_NOTIFICATION, // El correo del remitente
      to, // El correo del destinatario
      subject: 'Bienvenido', // El asunto del correo
      html: htmlContentTemplate, // El contenido del correo
    };

    try {
      // se realiza el proceso de envio de correo
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // solo el codigo: el mensaje de SMTP puede traer la direccion del destinatario
      this.logger.error(
        `Error enviando correo de bienvenida [${error?.code ?? 'sin código'}]`,
      );
    }
  }

  /**
   * Envía un correo con el enlace de los resultados de laboratorio
   * @param to correo del paciente
   * @param data nombre del paciente, enlace, vigencia, orden y laboratorio
   */
  async sendMailResults(to: string, data: ResultEmailData) {
    const labName = data.laboratory?.lab_name?.trim();
    const mailOptions = {
      // el paciente reconoce el correo por el nombre de su laboratorio
      from: labName
        ? { name: labName, address: process.env.USER_NOTIFICATION }
        : process.env.USER_NOTIFICATION,
      to,
      subject: labName
        ? `Tus resultados de laboratorio · ${labName}`
        : 'Resultados de laboratorio disponibles',
      html: templateEmailResult(data),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // solo el codigo: el mensaje de SMTP puede traer la direccion del destinatario
      this.logger.error(
        `Error enviando correo de resultados [${error?.code ?? 'sin código'}]`,
      );
      throw new InternalServerErrorException(
        'No fue posible enviar el correo con los resultados, intente más tarde',
      );
    }
  }

  /**
   * Envía el enlace para crear una contraseña nueva (recuperación). Si falla el
   * envío solo se registra: la respuesta al usuario no revela si el correo existe
   * @param to correo del usuario
   * @param nombre nombre del usuario
   * @param link enlace con el token
   */
  async sendMailPasswordReset(to: string, nombre: string, link: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.USER_NOTIFICATION,
        to,
        subject: 'Recupera tu contraseña',
        html: templateEmailPasswordReset(nombre, link),
      });
    } catch (error) {
      this.logger.error(
        `Error enviando correo de recuperación [${error?.code ?? 'sin código'}]`,
      );
    }
  }

  /**
   * Envía la contraseña temporal que asignó el administrador
   * @param to correo del usuario
   * @param nombre nombre del usuario
   * @param password contraseña temporal
   */
  async sendMailTemporaryPassword(
    to: string,
    nombre: string,
    password: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: process.env.USER_NOTIFICATION,
        to,
        subject: 'Tu contraseña fue restablecida',
        html: templateEmailTemporaryPassword(nombre, to, password),
      });
    } catch (error) {
      this.logger.error(
        `Error enviando contraseña temporal [${error?.code ?? 'sin código'}]`,
      );
      throw new InternalServerErrorException(
        'No fue posible enviar el correo con la contraseña temporal, intente más tarde',
      );
    }
  }
}
