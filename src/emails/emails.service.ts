import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { templateEmailWelcom } from './templates/templateEmailWelcom';
import { templateEmailResult } from './templates/templateEmailResult';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class EmailsService {

  private readonly logger = new Logger('EmailsService');

  private transporter: nodemailer.Transporter;


  // configuracion de parametros de envio de  correo
  constructor(
    private readonly exceptionService: ExceptionService,
  ){

    this.transporter = nodemailer.createTransport({

      service: process.env.SERVICE_NOTIFICATION,
      auth:{
        user: process.env.USER_NOTIFICATION,
        pass: process.env.PASSWORD_NOTIFICATION
      }

    });

  }


  /**
   * Funcion que se encarga de enviar un correo cuando se crea el usuario
   * @param to Correo del ussuario
   * @param nombre Nombre del usuario
   * @param password Contraseña asignada al usuario
   */
  async sendMailWelcome( to: string, nombre: string, password: string) {

    // reemplazamos los valores en la plantilla 
    const htmlContentTemplate = templateEmailWelcom(nombre, to, password);                             

    const mailOptions = {
      from: process.env.USER_NOTIFICATION, // El correo del remitente
      to, // El correo del destinatario
      subject:'Bienvenido', // El asunto del correo
      html: htmlContentTemplate, // El contenido del correo
    };

    try {

      // se realiza el proceso de envio de correo
      await this.transporter.sendMail(mailOptions);

    } catch (error) {

      // solo el codigo: el mensaje de SMTP puede traer la direccion del destinatario
      this.logger.error(`Error enviando correo de bienvenida [${error?.code ?? 'sin código'}]`);
    }
  }

  /**
   * Envía un correo con el enlace de descarga de los resultados de laboratorio
   * @param to Correo del usuario
   * @param name Nombre del usuario
   * @param urlResult URL de descarga de resultados
   */
  async sendMailResults(to: string, name: string, urlResult: string) {
    const htmlContentTemplate = templateEmailResult(urlResult, name);
    const mailOptions = {
      from: process.env.USER_NOTIFICATION,
      to,
      subject: 'Resultados de laboratorio disponibles',
      html: htmlContentTemplate,
    };

    try {

      await this.transporter.sendMail(mailOptions);

    } catch (error) {

      // solo el codigo: el mensaje de SMTP puede traer la direccion del destinatario
      this.logger.error(`Error enviando correo de resultados [${error?.code ?? 'sin código'}]`);
      throw new InternalServerErrorException('No fue posible enviar el correo con los resultados, intente más tarde');
    }
  }

}
