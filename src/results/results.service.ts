import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Res } from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { OrdersService } from '../orders/orders.service';
import { FilterOrderDto } from 'src/orders/dto/filter-order.dto';

@Injectable()
export class ResultsService {

  constructor(
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    private readonly exceptionService: ExceptionService,
    private readonly orderService: OrdersService, 
  ) {}

  /**
   * Funcion que se encarga de realizar la creacion de resultados en la base de datos
   * @param createResultDto Objeto con los datos del resultado a crear
   * @returns respuesta del proceso
   */
  async create(createResultDto: CreateResultDto) {
    
    try {

      // Creamos la referencia al resultado que se va a guardar con los registros enviados
      const result = this.resultRepository.create({
        ...createResultDto,
        order: { ord_id: createResultDto.order }, // Asignamos la referencia de la orden
        exam: { exa_id: createResultDto.exam }, // Asignamos la referencia del examen
        param: { par_id: createResultDto.param } // Asignamos la referencia del parámetro
      });

      // Guardamos el resultado en la base de datos
      await this.resultRepository.save(result);

      // cambiamos el estado de la orden a 'pendiente pdf'
      await this.orderService.changeStatus({
        ord_id: createResultDto.order,
        ord_status: 'PENDIENTE PDF',
      } as FilterOrderDto);

      return {
        status: 201,
        message: 'El resultado se ha creado correctamente',
      }

    } catch (error) {
      this.exceptionService.handleDBError(error);
      
    }
  }


  /**
   * Funcion que se encarga de obtener el listado de resultados
   * registrados
   * @returns listado de resultados
   */
  async findOne(ord_id: string) {

    try {

      const results = await this.resultRepository.find({
        where: { order: { ord_id } },
        relations: ['order', 'exam', 'param'],
      });
      
      return {
        status: 200,
        data: results ?? [],
      
      };
    } catch (error) {
      
      this.exceptionService.handleDBError(error);
    }
  }


  /**
   * Funcion que se encarga de buscar un resultado por su id
   * @param id id del resultado a buscar
   * @returns resultado encontrado
   */
  async update(id: string, updateResultDto: UpdateResultDto) {

    try {

      // Pre-cargamos el resultado a actualizar
      const result = await this.resultRepository.preload({
        res_id: id,
        ...updateResultDto,
        order: { ord_id: updateResultDto.order },
        exam: { exa_id: updateResultDto.exam },
        param: { par_id: updateResultDto.param }
      });

      if (!result) {
        throw new BadRequestException('No existe un resultado con el ID proporcionado');
      }

      // Guardamos el resultado actualizado en la base de datos
      await this.resultRepository.save(result);

      // cambiamos el estado de la orden a 'pendiente pdf'
      await this.orderService.changeStatus({
        ord_id: updateResultDto.order,
        ord_status: 'PENDIENTE PDF',
      } as FilterOrderDto);
      
      return {
        status: 200,
        message: 'El resultado se ha actualizado correctamente',
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }

}
