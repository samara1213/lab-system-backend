import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user.entity';

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

  findAll() {
    return `This action returns all customers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return `This action updates a #${id} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }

  /**
   * Metodo que se encarga de validar cualquier  tipo de error 
   * @param error generado
   */
    private handleExceptions(error: any) {

      console.log(error);
      
      if (23505 === +error.code) throw new BadRequestException(' Ya existe registro del cliente para esta empresa');
      
      // error no encontrado       
      throw new InternalServerErrorException('Error del sistema');


    }
}
