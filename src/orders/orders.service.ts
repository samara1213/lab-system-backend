import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { FilterOrderDto } from './dto/filter-order.dto';
import { buildOrderResultsHierarchy } from './helpers/order-results.helper';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { PdfService } from '../pdf/pdf.service';
import { stat } from 'fs';
import { EmailsService } from '../emails/emails.service';
import { StorageService } from '../storage/storage.service';


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
   * Método para crear una nueva orden de laboratorio
   * @param createOrderDto - Datos de la orden a crear
   * @returns Respuesta del proceso de creación
   */
  async create(createOrderDto: CreateOrderDto) {

    try {

      // desestructuramos el DTO para obtener los IDs de exámenes, laboratorio y cliente
      const { exa_ids, lab_id, cus_id, ...restOrders } = createOrderDto;

      // creamos la referencia de la orden de laboratorio
      const orders = this.orderRepository.create({
        ...restOrders,
        laboratory: { lab_id }, 
        customer: { cus_id }
      });

      // validamos is tenemos ids de exámenes
      if (exa_ids && exa_ids.length > 0) {
      
        orders.exams = exa_ids.map((id) => ({ exa_id: id }) as any); // Asignar solo el ID del examen
      
      } else {

        orders.exams = []; // Si no hay exámenes, asignar un array vacío
      }     

      // guardamos la orden en la base de datos
      await this.orderRepository.save(orders);

      // respuesta del proceso de creación
      return {
        status: 201,
        message: 'La orden de laboratorio se ha creado correctamente',
      }

    } catch (error) {

      this.exceptionService.handleDBError(error);

    }
  }


  /**
   * Método para encontrar una orden por su ID
   * @param id - ID de la orden a buscar
   * @returns Orden encontrada
   */
  async findOne(id: string) {

    try {
    
      const order = await this.orderRepository.findOne({
        where: { ord_id: id },
        relations: [
          'laboratory',
          'customer',
          'exams',
          'exams.parameters'
        ],
      });
    
      if (!order) {
        throw new NotFoundException('No existe registro con estos datos')
      }
    
      // respuesta del proceso de búsqueda
      return {
        status: 200,
        data: order,
      }
    
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
        order: { ord_created_at: 'DESC' }
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
        relations: ['customer'], // <-- Agrega la relación con customers
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
      const query = this.orderRepository.createQueryBuilder('order')
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
      const {data} = await this.findByLaboratoryAndStatus(filterOrderDto);

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
   * @param id - ID de la orden a actualizar
   * @param updateOrderDto - Nuevos datos para la orden
   * @returns Respuesta del proceso de actualización
   */
  async remove(ord_id: string) {

    try {

      const order = await this.orderRepository.preload({ 
        ord_id,
        ord_status: 'CANCELADA' // Cambiamos el estado a cancelada
      });

      // cambiamos el estado de la orden a cancelada
      await this.orderRepository.save(order);

      return {
        status: 200,
        message: 'La orden de laboratorio se ha cancelado correctamente',
      }
      
    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
    
  }

  /**
   * Método para cambiar el estado de una orden
   * @param filterOrderDto - DTO con los filtros ord_id y ord_status
   * @returns Respuesta del proceso de actualización
   */
  async changeStatus(filterOrderDto: FilterOrderDto) {

    try {

      const order = await this.orderRepository.preload({ 
        ord_id: filterOrderDto.ord_id,
        ord_status: filterOrderDto.ord_status // Cambiamos el estado a cancelada
      });

      // cambiamos el estado de la orden a cancelada
      await this.orderRepository.save(order);

      return {
        status: 200,
        message: 'La orden de laboratorio se ha actualizado correctamente',
      }
      
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
      const {data} = await this.findByLaboratoryAndStatus({
        lab_id: id_lab, 
        ord_status: 'CANCELADA'} as FilterOrderDto);

      // contamos cuantos registros tenemos en la data
      const count = data.length;

      return {
        status: 200,
        data: count
      }
      
    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
 

  }
 

  /**
   * Busca una orden por su ID y retorna la orden junto con los resultados asociados,
   * estructurando los resultados dentro de los parámetros de cada examen.
   * @param ord_id - ID de la orden
   * @returns Orden con exámenes, parámetros y resultados jerarquizados
   */
  async generatePdfResults(ord_id: string) {
    try {
      
      const { data } = await this.findOrderWithResults(ord_id); // Obtenemos la orden con resultados

      // Generar PDF de resultados ontenemos la url
      const urlResult = await this.pdfService.generateResult(data); // Generar PDF de resultados (opcional)
    
      // Actualizar la orden con la URL y el estado
      data.ord_status = 'FINALIZADA';
      data.ord_pdf_url = urlResult;

      // actualizamos en la tabla de ordenes la url del pdf
      await this.orderRepository.save(data);

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
   * @returns resultados de la orden
   */
  async findResultsByOrder(ord_id: string) {
    try {
      
      const { data } = await this.findOrderWithResults(ord_id); // Obtenemos la orden con resultados

      return {
        status: 200,
        data,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }


    /**
   * Busca una orden por su ID y retorna la orden junto con los resultados asociados,
   * estructurando los resultados dentro de los parámetros de cada examen.
   * @param ord_id - ID de la orden
   * @returns Orden con exámenes, parámetros y resultados jerarquizados
   */
  async findOrderWithResults(ord_id: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { ord_id },
        relations: [
          'laboratory',
          'customer',
          'exams',
          'exams.parameters',
          'results',
          'results.exam',
          'results.param',
        ],
      });
      if (!order) {
        throw new NotFoundException('No existe registro con estos datos');
      }
      // Usar helper para estructurar la respuesta
      const data = buildOrderResultsHierarchy(order);
      
      delete data.results; // Eliminamos el campo results ya que no es necesario en la respuesta final

      return {
        status: 200,
        data
      };

    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Obtiene la URL del PDF y los datos del cliente para una orden finalizada específica
   */
  async getUrlResult(ord_id: string) {

    try {
      const order = await this.orderRepository.findOne({
        where: { ord_id: ord_id, ord_status: 'FINALIZADA' },
        relations: ['customer'],
        select: ['ord_pdf_url', 'ord_id', 'customer'],
      });
    
      if (!order) throw new NotFoundException('No encontrada la orden o no está finalizada');
    
      return {
        status: 200,
        data: {
          ord_pdf_url: order.ord_pdf_url,
          fullName: `${order.customer?.cus_first_name ?? ''}
                     ${order.customer?.cus_second_name ?? ''}
                     ${order.customer?.cus_first_lastname ?? ''}
                     ${order.customer?.cus_second_lastname ?? ''}`,
          email: order.customer?.cus_email ?? '',
      }    
      };
    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }


  /**
   * Envía un correo con los resultados de la orden especificada
   * @param ord_id - ID de la orden cuyos resultados se enviarán por correo
   * @returns Respuesta del proceso de envío de correo
   */
  async sendEmailResults(ord_id: string) {

    try {

      // Obtenemos los datos d ela orden para enviar el correo
      const dataResult = await this.getUrlResult(ord_id);

      // ontnemos la url prefirmada del PDF
      const urlResult = await this.storageService.getSignedUrl(dataResult.data.ord_pdf_url);
      
      // enviamos el correo con los resultados
      await this.emailsService.sendMailResults(
        dataResult.data.email,
        dataResult.data.fullName,
        urlResult
      );

      return {
        status: 200,
        message: 'Se ha enviado el correo con los resultados correctamente',
      }      
      
    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
  }

  /**
   * Función para generar una URL prefirmada del PDF de resultados de una orden
   * @param ord_id ID de la orden para generar la URL prefirmada del PDF
   * @returns 
   */
  async generateUrlPrefirmate(ord_id: string) {

    try {

      // Obtenemos los datos d ela orden para enviar el correo
      const dataResult = await this.getUrlResult(ord_id);

      // ontnemos la url prefirmada del PDF
      const urlResult = await this.storageService.getSignedUrl(dataResult.data.ord_pdf_url);
      
      return {
        status: 200,
        data: {ord_pdf_url: urlResult}
      }      
      
    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
  }
  
}
