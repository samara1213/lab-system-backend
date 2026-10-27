import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger('CustomerService');

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly exceptionService: ExceptionService, // Importamos el módulo de excepciones
  ) {}

  /**
   * Funcion que se encarga de realizar el registro de un nuevo cliente a la empresa
   * @param lab_id id del laboratorio del usuario
   * @param createCustomerDto
   * @returns
   */
  async create(lab_id: string, createCustomerDto: CreateCustomerDto) {
    try {
      // el cliente siempre queda en el laboratorio del usuario
      // segundo nombre y apellido son opcionales en el DTO pero NOT NULL en la tabla
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        cus_second_name: createCustomerDto.cus_second_name ?? '',
        cus_second_lastname: createCustomerDto.cus_second_lastname ?? '',
        laboratory: { lab_id },
      });

      // Guardar el cliente en la base de datos
      await this.customerRepository.save(customer);

      return {
        status: 201,
        message: 'El cliente se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * funcion que se encarga de obtener todos los clientes de una empresa
   * @param idCompany  id de la empresa
   * @returns listado de clientes
   */
  async findAllByCompany(idCompany: string) {
    try {
      // se obtienen los registros de la  base de datos
      const arrayCustomers = await this.customerRepository.find({
        where: { laboratory: { lab_id: idCompany } },
      });

      // s eregresa la dato delos regsitros para la empresa
      return {
        status: 200,
        data: arrayCustomers ? arrayCustomers : [],
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Funcion que se encarga de realizar la busqueda de un cliente por su empresa
   * y numero de identificacion
   * @param filterCustomerDto datos del filtro aplicado
   * @returns datos del cliente
   */
  async findOneCustomer(filterCustomerDto: FilterCustomerDto) {
    try {
      // Consultamos el registro en la base de datos usando los nuevos nombres
      const customer = await this.customerRepository.findOne({
        where: {
          laboratory: { lab_id: filterCustomerDto.laboratory },
          cus_document_number: filterCustomerDto.cus_document_number,
        },
      });

      // regresamos el registro encontrado
      if (!customer)
        throw new BadRequestException('El cliente no se encuentra registrado');

      return {
        status: 200,
        data: customer,
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Funcion encargada de realizar la actualizacion de clientes
   * en la base de datos
   * @param id iddel cliente
   * @param lab_id id del laboratorio del usuario
   * @param updateCustomerDto dato para la actualizacion
   * @returns mensaje de respuesta del proceso
   */
  async update(
    id: string,
    lab_id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    try {
      // el cliente debe pertenecer al laboratorio del usuario
      const exists = await this.customerRepository.exists({
        where: { cus_id: id, laboratory: { lab_id } },
      });

      if (!exists)
        throw new NotFoundException('No existe cliente para este id');

      // el laboratorio del cliente no se cambia desde aqui
      const { laboratory, ...customerData } = updateCustomerDto;

      const customer = await this.customerRepository.preload({
        cus_id: id,
        ...customerData,
      });

      await this.customerRepository.save(customer);

      return {
        status: 200,
        message: 'Se actualizó el cliente correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
