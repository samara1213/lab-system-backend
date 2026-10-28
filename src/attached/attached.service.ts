import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Attached } from './entities/attached.entity';
import { Repository } from 'typeorm';
import { PdfService } from '../pdf/pdf.service';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { Order } from '../orders/entities/order.entity';
import { NOT_FOUND_MESSAGE } from '../auth/helpers/laboratory-access.helper';
import { detectFileType } from '../storage/file-type.helper';
import { StorageService } from '../storage/storage.service';

// vigencia de la URL para ver un adjunto
const ATTACHED_URL_TTL_SECONDS = 10 * 60;

@Injectable()
export class AttachedService {
  // creamos el constructor del servicio de orders
  constructor(
    @InjectRepository(Attached) // Assuming Order is the entity for orders
    private readonly attachedRepository: Repository<Attached>,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Adjuntos de una orden del laboratorio (sin la ruta en Storage)
   * @param orderId id de la orden
   * @param lab_id id del laboratorio del usuario
   */
  async findByOrder(orderId: string, lab_id: string) {
    try {
      await this.assertOrder(orderId, lab_id);
      const attached = await this.attachedRepository.find({
        where: { order: { ord_id: orderId } },
        order: { att_created_at: 'DESC' },
      });
      return {
        status: 200,
        data: attached.map(({ att_id, att_created_at, att_file_url }) => ({
          att_id,
          att_created_at,
          type: att_file_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        })),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * URL firmada y corta para ver un adjunto (no se guarda en ningún lado)
   * @param att_id id del adjunto
   * @param lab_id id del laboratorio del usuario
   */
  async getViewUrl(att_id: string, lab_id: string) {
    try {
      const attached = await this.getInLaboratory(att_id, lab_id);
      const url = await this.storageService.getSignedUrl(
        attached.att_file_url,
        ATTACHED_URL_TTL_SECONDS,
      );
      return { status: 200, data: { url } };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Elimina un adjunto y su archivo del bucket
   * @param att_id id del adjunto
   * @param lab_id id del laboratorio del usuario
   */
  async remove(att_id: string, lab_id: string) {
    try {
      const attached = await this.getInLaboratory(att_id, lab_id);
      await this.attachedRepository.delete({ att_id });
      await this.storageService.deleteFile(attached.att_file_url);
      return {
        status: 200,
        message: 'El archivo adjunto se ha eliminado',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  // la orden debe pertenecer al laboratorio del usuario (si no, 404)
  private async assertOrder(orderId: string, lab_id: string) {
    const orderExists = await this.attachedRepository.manager.exists(Order, {
      where: { ord_id: orderId, laboratory: { lab_id } },
    });
    if (!orderExists) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }

  // adjunto de una orden del laboratorio del usuario (si no, 404)
  private async getInLaboratory(att_id: string, lab_id: string) {
    const attached = await this.attachedRepository.findOne({
      where: { att_id, order: { laboratory: { lab_id } } },
    });
    if (!attached) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return attached;
  }
  /**
   * Recibe el id de la orden y el archivo adjunto
   * @param orderId id de la orden
   * @param lab_id id del laboratorio del usuario
   * @param file archivo adjunto
   */
  async create(orderId: string, lab_id: string, file: Express.Multer.File) {
    try {
      // la orden debe pertenecer al laboratorio del usuario
      await this.assertOrder(orderId, lab_id);

      // validamos el tipo real del archivo por su contenido
      if (!file?.buffer)
        throw new BadRequestException('Debe adjuntar un archivo');
      const fileType = detectFileType(file.buffer);
      if (!fileType)
        throw new BadRequestException(
          'Tipo de archivo no permitido. Solo PDF o imágenes (PNG, JPG, GIF, WEBP, BMP)',
        );

      // cargar el archivo al storage y obtener la url
      const urlFile = await this.pdfService.uploadFileBuffer(
        file.buffer,
        lab_id,
        fileType,
      );

      // Buscar si ya existe un registro para la orden
      let attached = await this.attachedRepository.findOne({
        where: { order: { ord_id: orderId } },
      });

      if (attached) {
        // Actualizar el registro existente y borrar el archivo reemplazado
        const previousFile = attached.att_file_url;
        attached.att_file_url = urlFile;
        await this.attachedRepository.save(attached);
        if (previousFile && previousFile !== urlFile)
          await this.storageService.deleteFile(previousFile);
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
