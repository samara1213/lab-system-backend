import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attached } from './entities/attached.entity';
import { Repository } from 'typeorm';
import { PdfService } from '../pdf/pdf.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
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
   * @param file archivo adjunto
   */
  async create(orderId: string, file: Express.Multer.File) {

    try {

      // cargar el archivo al storage y obtener la url
      const urlFile = await this.pdfService.uploadFileBuffer(file);

      const attached = this.attachedRepository.create({        
       order:{ ord_id: orderId},
       att_file_url: urlFile
      });

      await this.attachedRepository.save(attached);

       return {
        status: 201,
        message: 'Archivo adjunto guardado correctamente',
      }
      
    } catch (error) {
      console.error('Error al guardar el archivo adjunto:', error);
      this.exceptionService.handleDBError(error);
    }
  }  
}
