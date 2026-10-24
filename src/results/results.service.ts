import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { OrdersService } from '../orders/orders.service';
import { ParamsExam } from '../params_exams/entities/params_exam.entity';
import { NOT_FOUND_MESSAGE } from '../auth/helpers/laboratory-access.helper';

@Injectable()
export class ResultsService {

  constructor(
    @InjectRepository(Result)
    private readonly resultRepository: Repository<Result>,
    private readonly exceptionService: ExceptionService,
    private readonly orderService: OrdersService,
  ) {}

  /**
   * Valida que el parámetro pertenezca al examen y que el examen sea del laboratorio
   * @param exa_id id del examen
   * @param par_id id del parámetro
   * @param lab_id id del laboratorio del usuario
   */
  private async assertParamInLaboratory(exa_id: string, par_id: string, lab_id: string) {

    // TypeORM ignora las condiciones undefined/null: sin ids no se puede validar
    if (!exa_id || !par_id || !lab_id) throw new NotFoundException(NOT_FOUND_MESSAGE);

    const exists = await this.resultRepository.manager.exists(ParamsExam, {
      where: { par_id, exam: { exa_id, laboratory: { lab_id } } },
    });

    if (!exists) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }

  /**
   * Funcion que se encarga de realizar la creacion de resultados en la base de datos
   * @param lab_id id del laboratorio del usuario
   * @param createResultDto Objeto con los datos del resultado a crear
   * @returns respuesta del proceso
   */
  async create(lab_id: string, createResultDto: CreateResultDto) {

    try {

      // la orden, el examen y el parámetro deben ser del laboratorio del usuario
      await this.orderService.assertOrderInLaboratory(createResultDto.order, lab_id);
      await this.assertParamInLaboratory(createResultDto.exam, createResultDto.param, lab_id);

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
      await this.orderService.updateStatus(createResultDto.order, 'PENDIENTE PDF');

      return {
        status: 201,
        message: 'El resultado se ha creado correctamente',
      }

    } catch (error) {
      this.exceptionService.handleDBError(error);

    }
  }


  /**
   * Funcion que se encarga de obtener el listado de resultados de una orden
   * @param ord_id id de la orden
   * @param lab_id id del laboratorio del usuario
   * @returns listado de resultados
   */
  async findOne(ord_id: string, lab_id: string) {

    try {

      await this.orderService.assertOrderInLaboratory(ord_id, lab_id);

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
   * Funcion que se encarga de actualizar un resultado
   * @param id id del resultado a actualizar
   * @param lab_id id del laboratorio del usuario
   * @param updateResultDto datos a actualizar
   * @returns respuesta del proceso
   */
  async update(id: string, lab_id: string, updateResultDto: UpdateResultDto) {

    try {

      // el resultado debe pertenecer a una orden del laboratorio del usuario
      const current = await this.resultRepository.findOne({
        where: { res_id: id, order: { laboratory: { lab_id } } },
        relations: ['order', 'exam', 'param'],
      });

      if (!current) throw new NotFoundException('No existe un resultado con el ID proporcionado');

      // si no se envían, se conservan la orden, el examen y el parámetro actuales
      const ord_id = updateResultDto.order ?? current.order.ord_id;
      const exa_id = updateResultDto.exam ?? current.exam.exa_id;
      const par_id = updateResultDto.param ?? current.param.par_id;

      if (ord_id !== current.order.ord_id) await this.orderService.assertOrderInLaboratory(ord_id, lab_id);
      if (exa_id !== current.exam.exa_id || par_id !== current.param.par_id) {
        await this.assertParamInLaboratory(exa_id, par_id, lab_id);
      }

      // Pre-cargamos el resultado a actualizar
      const result = await this.resultRepository.preload({
        res_id: id,
        ...updateResultDto,
        order: { ord_id },
        exam: { exa_id },
        param: { par_id }
      });

      // Guardamos el resultado actualizado en la base de datos
      await this.resultRepository.save(result);

      // cambiamos el estado de la orden a 'pendiente pdf'
      await this.orderService.updateStatus(ord_id, 'PENDIENTE PDF');

      return {
        status: 200,
        message: 'El resultado se ha actualizado correctamente',
      };

    } catch (error) {

      this.exceptionService.handleDBError(error);
    }
  }

}
