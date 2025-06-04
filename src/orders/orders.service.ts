import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { FilterOrderDto } from './dto/filter-order.dto';


@Injectable()
export class OrdersService {

  // creamos el constructor del servicio de orders
  constructor(
    @InjectRepository(Order) // Assuming Order is the entity for orders
    private readonly orderRepository: Repository<Order>,
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

      this.handleDBError(error);

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
        relations: ['laboratory', 'customer', 'exams'],
    
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
    
      this.handleDBError(error);
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
      this.handleDBError(error);
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
        order: { ord_created_at: 'DESC' }
      });

      return {
        status: 200,
        data: orders ?? [],
      };

    } catch (error) {

      this.handleDBError(error);
      
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
      this.handleDBError(error);
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

      this.handleDBError(error);

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

      this.handleDBError(error);
      
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

      this.handleDBError(error);
      
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

      this.handleDBError(error);
      
    }
 

  }

  /**
     * Método para obtener una opción de menú por su ID
     * @param id - ID de la opción de menú a buscar
     * @returns Opción de menú encontrada
  */
  private handleDBError(error: any): never { 
   
  
      if (error.code === '23505') {
  
        throw new ConflictException('En este momento no se puede procesar la solicitud, por favor intente más tarde');
      }
  
      throw new InternalServerErrorException('Error al procesar la solicitud, por favor intente más tarde');
    }
  
}
