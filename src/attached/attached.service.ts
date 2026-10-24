import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attached } from './entities/attached.entity';
import { Repository } from 'typeorm';
import { PdfService } from '../pdf/pdf.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { Order } from '../orders/entities/order.entity';
import { NOT_FOUND_MESSAGE } from '../auth/helpers/laboratory-access.helper';
import { detectFileType } from '../storage/file-type.helper';
// Importa el tipo correcto para archivos en NestJS

@Injectable()
export class AttachedService {

    // creamos el constructor del servicio de orders
    constructor(
      @InjectRepository(Attached) // Assuming Order is the entity for orders
      private readonly attachedRepository: Repository<Attached>,    
      private readonly pdfService: PdfService,
       private readonly exceptionService: ExceptionService,
    ) {}
  /**
   * Recibe el id de la orden y el archivo adjunto
   * @param orderId id de la orden
   * @param lab_id id del laboratorio del usuario
   * @param file archivo adjunto
   */
  async create(orderId: string, lab_id: string, file: Express.Multer.File) {

    try {

      // la orden debe pertenecer al laboratorio del usuario
      const orderExists = await this.attachedRepository.manager.exists(Order, {
        where: { ord_id: orderId, laboratory: { lab_id } },
      });
      if (!orderExists) throw new NotFoundException(NOT_FOUND_MESSAGE);

      // validamos el tipo real del archivo por su contenido
      if (!file?.buffer) throw new BadRequestException('Debe adjuntar un archivo');
      const fileType = detectFileType(file.buffer);
      if (!fileType) throw new BadRequestException('Tipo de archivo no permitido. Solo PDF o imágenes (PNG, JPG, GIF, WEBP, BMP)');

      // cargar el archivo al storage y obtener la url
      const urlFile = await this.pdfService.uploadFileBuffer(file.buffer, lab_id, fileType);

      // Buscar si ya existe un registro para la orden
      let attached = await this.attachedRepository.findOne({ where: { order: { ord_id: orderId } } });

      if (attached) {
        // Actualizar el registro existente
        attached.att_file_url = urlFile;
        await this.attachedRepository.save(attached);
        return {
          status: 200,
          message: 'Archivo adjunto actualizado correctamente',
        };
      } else {
        // Crear nuevo registro
        attached = this.attachedRepository.create({
          order: { ord_id: orderId },
          att_file_url: urlFile,
        });
        await this.attachedRepository.save(attached);
        return {
          status: 201,
          message: 'Archivo adjunto guardado correctamente',
        };
      }
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }  
}
