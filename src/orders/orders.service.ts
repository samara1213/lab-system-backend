import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { In, Repository } from 'typeorm';
import { FilterOrderDto } from './dto/filter-order.dto';
import { Customer } from '../customers/entities/customer.entity';
import { Exam } from '../exams/entities/exam.entity';
import { NOT_FOUND_MESSAGE } from '../auth/helpers/laboratory-access.helper';
import {
  buildOrderResultsHierarchy,
  withoutSignaturePaths,
} from './helpers/order-results.helper';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { PdfService } from '../pdf/pdf.service';
import { EmailsService } from '../emails/emails.service';
import { StorageService } from '../storage/storage.service';

/**
 * Horas de validez del enlace del correo de resultados (RESULT_URL_TTL; 48 por defecto, máximo 168)
 */
const resultUrlTtlHours = () => {
  const hours = Number(process.env.RESULT_URL_TTL);
  return Number.isFinite(hours) && hours >= 1
    ? Math.min(Math.floor(hours), 168)
    : 48;
};

@Injectable()
export class OrdersService {
  // creamos el constructor del servicio de orders
  constructor(
    @InjectRepository(Order) // Assuming Order is the entity for orders
    private readonly orderRepository: Repository<Order>,
    private readonly exceptionService: ExceptionService,
    private readonly pdfService: PdfService,
    private readonly emailsService: EmailsService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Valida que una orden exista y pertenezca al laboratorio indicado
   * @param ord_id - ID de la orden
   * @param lab_id - ID del laboratorio del usuario
   */
  async assertOrderInLaboratory(ord_id: string, lab_id: string) {
    // TypeORM ignora las condiciones undefined/null: sin id no se puede validar
    if (!ord_id || !lab_id) throw new NotFoundException(NOT_FOUND_MESSAGE);

    const exists = await this.orderRepository.exists({
      where: { ord_id, laboratory: { lab_id } },
    });

    if (!exists) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }

  /**
   * Método para crear una nueva orden de laboratorio
   * @param lab_id - ID del laboratorio del usuario
   * @param createOrderDto - Datos de la orden a crear
   * @returns Respuesta del proceso de creación
   */
  async create(lab_id: string, createOrderDto: CreateOrderDto) {
    try {
      // desestructuramos el DTO para obtener los IDs de exámenes y cliente
      const { exa_ids, lab_id: _labId, cus_id, ...restOrders } = createOrderDto;

      // el paciente debe pertenecer al laboratorio del usuario
      const customerExists = await this.orderRepository.manager.exists(
        Customer,
        {
          where: { cus_id, laboratory: { lab_id } },
        },
      );
      if (!customerExists) throw new NotFoundException('El paciente no existe');

      // todos los exámenes deben pertenecer al laboratorio del usuario
      const uniqueExamIds = [...new Set(exa_ids ?? [])];
      if (uniqueExamIds.length > 0) {
        const examsCount = await this.orderRepository.manager.count(Exam, {
          where: { exa_id: In(uniqueExamIds), laboratory: { lab_id } },
        });
        if (examsCount !== uniqueExamIds.length)
          throw new NotFoundException('Uno o más exámenes no existen');
      }

      // creamos la referencia de la orden de laboratorio
      const orders = this.orderRepository.create({
        ...restOrders,
        laboratory: { lab_id },
        customer: { cus_id },
      });

      // validamos is tenemos ids de exámenes
      if (uniqueExamIds.length > 0) {
        orders.exams = uniqueExamIds.map(
          (id) =>
            ({
              exa_id: id,
            }) as any,
        ); // Asignar solo el ID del examen
      } else {
        orders.exams = []; // Si no hay exámenes, asignar un array vacío
      }

      // guardamos la orden en la base de datos
      await this.orderRepository.save(orders);

      // respuesta del proceso de creación
      return {
        status: 201,
        message: 'La orden de laboratorio se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Método para encontrar una orden por su ID dentro del laboratorio
   * @param id - ID de la orden a buscar
   * @param lab_id - ID del laboratorio del usuario
   * @returns Orden encontrada
   */
  async findOne(id: string, lab_id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { ord_id: id, laboratory: { lab_id } },
        relations: {
          laboratory: true,
          customer: true,

          exams: {
            parameters: true,
          },
        },
      });

      if (!order) {
        throw new NotFoundException('No existe registro con estos datos');
      }

      // respuesta del proceso de búsqueda
      return {
        status: 200,
        data: order,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Busca todas las órdenes de un cliente y laboratorio específico
   * @param filterOrderDto - DTO con los filtros lab_id y cus_id
   * @returns Lista de órdenes encontradas
   */
  async findByCustomerAndLaboratory(filterOrderDto: FilterOrderDto) {
    try {
      const orders = await this.orderRepository.find({
        where: {
          laboratory: { lab_id: filterOrderDto.lab_id },
          customer: { cus_id: filterOrderDto.cus_id },
        },
        order: { ord_created_at: 'DESC' },
      });

      return {
        status: 200,
        data: orders ?? [],
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Busca todas las órdenes de un laboratorio y estado específico
   * @param filterOrderDto - DTO con los filtros lab_id y ord_status
   * @returns Lista de órdenes encontradas
   */
  async findByLaboratoryAndStatus(filterOrderDto: FilterOrderDto) {
    try {
      const orders = await this.orderRepository.find({
        where: {
          laboratory: { lab_id: filterOrderDto.lab_id },
          ord_status: filterOrderDto.ord_status,
        },
        order: { ord_created_at: 'DESC' },
        relations: {
          customer: true,
        }, // <-- Agrega la relación con customers
      });

      return {
        status: 200,
        data: orders ?? [],
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Cuenta cuántas órdenes se registraron en la fecha actual
   * @param lab_id - ID del laboratorio (opcional, si quieres filtrar por laboratorio)
   * @returns Número de órdenes creadas hoy
   */
  async countOrdersToday(lab_id?: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // construccion de la consulta
      const query = this.orderRepository
        .createQueryBuilder('order')
        .where('order.ord_created_at >= :today', { today })
        .andWhere('order.ord_created_at < :tomorrow', { tomorrow })
        .andWhere('order.laboratory = :lab_id', { lab_id });

      const count = await query.getCount();

      // respuesta del proceso de conteo
      return {
        status: 200,
        data: count,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Cuenta cuántas órdenes existen por estado y laboratorio
   * @param filterOrderDto - DTO con los filtros lab_id y ord_status
   * @returns Número de órdenes encontradas
   */
  async countOrdersByStatusAndLaboratory(filterOrderDto: FilterOrderDto) {
    try {
      // llamamos al método para obtener las órdenes por laboratorio y estado
      const { data } = await this.findByLaboratoryAndStatus(filterOrderDto);

      // contamos la cantidad de órdenes obtenidas
      const count = data.length;

      // respuesta del proceso de conteo
      return {
        status: 200,
        data: count,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Método para actualizar una orden existente a estado cancelada
   * @param ord_id - ID de la orden a cancelar
   * @param lab_id - ID del laboratorio del usuario
   * @returns Respuesta del proceso de actualización
   */
  async remove(ord_id: string, lab_id: string) {
    try {
      // la orden debe existir en el laboratorio del usuario
      await this.assertOrderInLaboratory(ord_id, lab_id);

      const order = await this.orderRepository.preload({
        ord_id,
        ord_status: 'CANCELADA', // Cambiamos el estado a cancelada
      });

      // cambiamos el estado de la orden a cancelada
      await this.orderRepository.save(order);

      return {
        status: 200,
        message: 'La orden de laboratorio se ha cancelado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Actualiza el estado de una orden. Uso interno: quien lo llama ya validó
   * que la orden pertenece al laboratorio del usuario
   * @param ord_id - ID de la orden
   * @param ord_status - nuevo estado
   */
  async updateStatus(ord_id: string, ord_status: string) {
    await this.orderRepository.update({ ord_id }, { ord_status });
  }

  /**
   * Método para cambiar el estado de una orden del laboratorio del usuario
   * @param filterOrderDto - DTO con los filtros ord_id y ord_status
   * @param lab_id - ID del laboratorio del usuario
   * @returns Respuesta del proceso de actualización
   */
  async changeStatus(filterOrderDto: FilterOrderDto, lab_id: string) {
    try {
      // la orden debe existir en el laboratorio del usuario
      await this.assertOrderInLaboratory(filterOrderDto.ord_id, lab_id);

      await this.updateStatus(filterOrderDto.ord_id, filterOrderDto.ord_status);

      return {
        status: 200,
        message: 'La orden de laboratorio se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Cuenta cuántas órdenes canceladas existen por laboratorio
   * @param id_lab - ID del laboratorio
   * @returns Número de órdenes canceladas
   */
  async countOrdersCancel(id_lab: string) {
    try {
      // buscamos las ordenes de compra por estado cancelada
      const { data } = await this.findByLaboratoryAndStatus({
        lab_id: id_lab,
        ord_status: 'CANCELADA',
      } as FilterOrderDto);

      // contamos cuantos registros tenemos en la data
      const count = data.length;

      return {
        status: 200,
        data: count,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Busca una orden por su ID y retorna la orden junto con los resultados asociados,
   * estructurando los resultados dentro de los parámetros de cada examen.
   * @param ord_id - ID de la orden
   * @param lab_id - ID del laboratorio del usuario
   * @returns Orden con exámenes, parámetros y resultados jerarquizados
   */
  async generatePdfResults(ord_id: string, lab_id: string) {
    try {
      const { data } = await this.findOrderWithResults(ord_id, lab_id); // Obtenemos la orden con resultados
      const previousPdf = data.ord_pdf_url;

      // cada PDF queda con un nombre nuevo en el bucket
      const urlResult = await this.pdfService.generateResult(data);

      // solo se actualizan la ruta y el estado (sin volver a guardar exámenes ni resultados)
      await this.orderRepository.update(
        { ord_id },
        { ord_status: 'FINALIZADA', ord_pdf_url: urlResult },
      );

      // el PDF anterior ya no se usa
      if (previousPdf && previousPdf !== urlResult)
        await this.storageService.deleteFile(previousPdf);

      return {
        status: 200,
        message: 'Se ha generado el PDF de resultados correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Funcion que regresa los resultados de una orden por su ID
   * @param ord_id id de la orden a buscar
   * @param lab_id id del laboratorio del usuario
   * @returns resultados de la orden
   */
  async findResultsByOrder(ord_id: string, lab_id: string) {
    try {
      const { data } = await this.findOrderWithResults(ord_id, lab_id); // Obtenemos la orden con resultados

      return {
        status: 200,
        data: withoutSignaturePaths(data),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Busca una orden por su ID y retorna la orden junto con los resultados asociados,
   * estructurando los resultados dentro de los parámetros de cada examen.
   * @param ord_id - ID de la orden
   * @param lab_id - ID del laboratorio del usuario
   * @returns Orden con exámenes, parámetros y resultados jerarquizados
   */
  async findOrderWithResults(ord_id: string, lab_id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { ord_id, laboratory: { lab_id } },
        relations: {
          laboratory: true,
          customer: true,

          exams: {
            parameters: true,
            // sección del PDF
            classification: true,
          },

          results: {
            exam: true,
            param: true,
            // quien firma cada examen (último que modificó sus resultados)
            updatedBy: true,
          },

          attachedFiles: true,
        },
      });
      if (!order) {
        throw new NotFoundException('No existe registro con estos datos');
      }
      // Usar helper para estructurar la respuesta
      const data = buildOrderResultsHierarchy(order);

      delete data.results; // Eliminamos el campo results ya que no es necesario en la respuesta final

      return {
        status: 200,
        data,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Obtiene la URL del PDF y los datos del cliente para una orden finalizada específica
   */
  async getUrlResult(ord_id: string, lab_id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          ord_id: ord_id,
          ord_status: 'FINALIZADA',
          laboratory: { lab_id },
        },
        relations: {
          customer: true,
          laboratory: true,
        },
        select: {
          ord_pdf_url: true,
          ord_id: true,
          ord_code: true,
          customer: true,
          laboratory: {
            lab_id: true,
            lab_name: true,
            lab_phone: true,
            lab_email: true,
          },
        },
      });

      if (!order)
        throw new NotFoundException(
          'No encontrada la orden o no está finalizada',
        );

      return {
        status: 200,
        data: {
          ord_pdf_url: order.ord_pdf_url,
          fullName: `${order.customer?.cus_first_name ?? ''}
                     ${order.customer?.cus_second_name ?? ''}
                     ${order.customer?.cus_first_lastname ?? ''}
                     ${order.customer?.cus_second_lastname ?? ''}`
            .replace(/\s+/g, ' ')
            .trim(),
          email: order.customer?.cus_email ?? '',
          ord_code: order.ord_code,
          laboratory: order.laboratory,
        },
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Envía un correo con los resultados de la orden especificada
   * @param ord_id - ID de la orden cuyos resultados se enviarán por correo
   * @param lab_id - ID del laboratorio del usuario
   * @returns Respuesta del proceso de envío de correo
   */
  async sendEmailResults(ord_id: string, lab_id: string) {
    try {
      // Obtenemos los datos d ela orden para enviar el correo
      const { data } = await this.getUrlResult(ord_id, lab_id);
      if (!data.email?.trim())
        throw new BadRequestException(
          'El paciente no tiene correo registrado. Agréguelo en Pacientes y vuelva a enviar',
        );

      // el enlace del correo dura más que el de ver/imprimir (RESULT_URL_TTL, en horas)
      const ttlHours = resultUrlTtlHours();
      const urlResult = await this.storageService.getSignedUrl(
        data.ord_pdf_url,
        ttlHours * 3600,
      );

      await this.emailsService.sendMailResults(data.email.trim(), {
        name: data.fullName,
        url: urlResult,
        expiresInHours: ttlHours,
        orderCode: data.ord_code,
        laboratory: data.laboratory,
      });

      return {
        status: 200,
        message: 'Se ha enviado el correo con los resultados correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Función para generar una URL prefirmada del PDF de resultados de una orden
   * @param ord_id ID de la orden para generar la URL prefirmada del PDF
   * @param lab_id ID del laboratorio del usuario
   * @returns
   */
  async generateUrlPrefirmate(ord_id: string, lab_id: string) {
    try {
      // Obtenemos los datos d ela orden para enviar el correo
      const dataResult = await this.getUrlResult(ord_id, lab_id);

      // ontnemos la url prefirmada del PDF
      const urlResult = await this.storageService.getSignedUrl(
        dataResult.data.ord_pdf_url,
      );

      return {
        status: 200,
        data: { ord_pdf_url: urlResult },
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
