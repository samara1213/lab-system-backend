import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { FilterCustomerDto } from './dto/filter-customer.dto';
import { ExceptionService } from '../exceptions/exception/exception.service';


@Injectable()
export class CustomersService {

  private readonly logger = new Logger('CustomerService');

  constructor(
    
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly exceptionService: ExceptionService, // Importamos el módulo de excepciones

  ){}


  /**
   * Funcion que se encarga de realizar el registro de un nuevo cliente a la empresa
   * @param createCustomerDto 
   * @returns 
   */
  async create(createCustomerDto: CreateCustomerDto) {

    try {
    
      // Asignar la relación con laboratorio usando el id recibido
      const customer = this.customerRepository.create({
        ...createCustomerDto,
        laboratory: { lab_id: createCustomerDto.laboratory }
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
        data: arrayCustomers ? arrayCustomers : []
      }
      
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
          cus_document_number: filterCustomerDto.cus_document_number
        }
      });
      
      // regresamos el registro encontrado
      if (!customer) throw new BadRequestException('El cliente no se encuentra registrado');

      return {
        status: 200,
        data: customer
      }

    } catch (error) {

      this.exceptionService.handleDBError(error);
      
    }
  }

  /**
   * Funcion encargada de realizar la actualizacion de clientes
   * en la base de datos
   * @param id iddel cliente
   * @param updateCustomerDto dato para la actualizacion 
   * @param user datos d el ususario logueado
   * @returns mensaje de respuesta del proceso
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto) {

    try {

      // precargamos los datos del usuario a actualizar
      let laboratory = undefined;

      if (updateCustomerDto.laboratory) {
        laboratory = { lab_id: updateCustomerDto.laboratory };
      }

      const customer = await this.customerRepository.preload({
        cus_id: id,
        ...updateCustomerDto,
        ...(laboratory && { laboratory })
      });

      if (!customer) throw new BadRequestException('No existe cliente para este id');

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
