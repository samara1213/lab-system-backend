import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { templateEmailWelcom } from './templates/templateEmailWelcom';

@Injectable()
export class EmailsService {

  private transporter: nodemailer.Transporter;


  // configuracion de parametros de envio de  correo
  constructor(){

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
      const info = await this.transporter.sendMail(mailOptions);

      console.log('Correo enviado: ', info.response);

    } catch (error) {

      console.error('Error enviando correo: ', error);
    }
  }

}
