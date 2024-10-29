import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user.entity';
import { FilterCustomerDto } from './dto/filter-customer.dto';

@Injectable()
export class CustomersService {

  private readonly logger = new Logger('CustomerService');

  constructor(
    
    @InjectRepository(Customer)

    private readonly customerRepository: Repository<Customer>

  ){}


  /**
   * Funcion que se encarga de realizar el registro de un nuevo cliente a la empresa
   * @param createCustomerDto 
   * @returns 
   */
  async create(createCustomerDto: CreateCustomerDto, user: User) {
    
    try {
      
      // preparamos la data a insertar del nuevo cliente
      const customer = this.customerRepository.create(createCustomerDto);
      
      // realizamos la persistencia en la base de datos
      await this.customerRepository.save({
        ...customer,
        cus_usuario_creacion: user.use_id
      })

      return {

        message: 'El registro del cliente fue exitoso'
        
      }
      
      
    } catch (error) {

      this.handleExceptions(error);
      
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
        where: { cus_companie: idCompany}
      }); 

      // s eregresa la dato delos regsitros para la empresa
      return {
        data: arrayCustomers ? arrayCustomers : []
      }


      
    } catch (error) {
      
      this.handleExceptions(error);
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

      // consutamos el registro en la base de datos
      const customer =  await this.customerRepository.findOne({
        where: { cus_companie: filterCustomerDto.cus_companie, 
                 cus_numero_doc: filterCustomerDto.cus_numero_doc}
      });
      
      // regresamo el rregsitro encoentrado 
      if (!customer) throw new BadRequestException('EL cliente no se encuentra registrado');

      // se regresa los datos encoentrados
      return {
        data: customer
      }

    } catch (error) {

      this.handleExceptions(error);
      
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
  async update(id: string, updateCustomerDto: UpdateCustomerDto, user: User) {

    try {

      // precargamos los datos del usuario a actualizar
      const customer = await this.customerRepository.preload({
        
        cus_id:  id,
        ...updateCustomerDto,
        cus_usuario_modificacion: user.use_id
      });

      // realizamos la persistencia en la base de datos
      this.customerRepository.save(customer);

      return {

        message: 'Se actualizo el cliente correctamente'
        
      }
      
    } catch (error) {
      
      this.handleExceptions(error);
    }
  }

  
  /**
   * Metodo que se encarga de validar cualquier  tipo de error 
   * @param error generado
   */
    private handleExceptions(error: any) {

      console.log(error);
      
      if (23505 === +error.code) throw new BadRequestException(' Ya existe registro del cliente para esta empresa');
      
      // error no encontrado 
      if (400 === +error.status) throw new BadRequestException(error.response.message);

      throw new InternalServerErrorException('Error del sistema');


    }
}
