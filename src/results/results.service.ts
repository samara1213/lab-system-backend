import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BatchResultItemDto,
  CreateResultsBatchDto,
} from './dto/create-results-batch.dto';
import { Order } from '../orders/entities/order.entity';
import { User } from '../auth/entities/user.entity';
import { hasPermission } from '../permissions/permissions.helper';
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
  private async assertParamInLaboratory(
    exa_id: string,
    par_id: string,
    lab_id: string,
  ) {
    // TypeORM ignora las condiciones undefined/null: sin ids no se puede validar
    if (!exa_id || !par_id || !lab_id)
      throw new NotFoundException(NOT_FOUND_MESSAGE);

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
  async create(lab_id: string, createResultDto: CreateResultDto, actor?: User) {
    try {
      // la orden, el examen y el parámetro deben ser del laboratorio del usuario
      await this.orderService.assertOrderInLaboratory(
        createResultDto.order,
        lab_id,
      );
      await this.assertParamInLaboratory(
        createResultDto.exam,
        createResultDto.param,
        lab_id,
      );

      // Creamos la referencia al resultado que se va a guardar con los registros enviados
      const result = this.resultRepository.create({
        ...createResultDto,
        order: { ord_id: createResultDto.order }, // Asignamos la referencia de la orden
        exam: { exa_id: createResultDto.exam }, // Asignamos la referencia del examen
        param: { par_id: createResultDto.param }, // Asignamos la referencia del parámetro
        // trazabilidad: quién registró el resultado
        ...(actor
          ? {
              registeredBy: { use_id: actor.use_id },
              updatedBy: { use_id: actor.use_id },
            }
          : {}),
      });

      // Guardamos el resultado en la base de datos
      await this.resultRepository.save(result);

      // cambiamos el estado de la orden a 'pendiente pdf'
      await this.orderService.updateStatus(
        createResultDto.order,
        'PENDIENTE PDF',
      );

      return {
        status: 201,
        message: 'El resultado se ha creado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Guarda todos los resultados de una orden en una transacción: crea los nuevos,
   * actualiza los que cambiaron y deja la orden en 'PENDIENTE PDF' una sola vez.
   * Registra quién creó y quién modificó cada resultado (el último en modificar
   * los parámetros de un examen es quien lo firma en el PDF)
   * @param lab_id laboratorio del usuario
   * @param dto orden y resultados por parámetro
   * @param actor usuario autenticado
   * @returns cantidades creadas, actualizadas y sin cambio; advertencia si no tiene firma
   */
  async createBatch(lab_id: string, dto: CreateResultsBatchDto, actor: User) {
    try {
      const summary = await this.resultRepository.manager.transaction(
        async (manager) => {
          // bloquea la orden: dos personas guardando a la vez no duplican resultados
          const order = await manager.findOne(Order, {
            where: { ord_id: dto.order, laboratory: { lab_id } },
            lock: { mode: 'pessimistic_write' },
          });
          if (!order) throw new NotFoundException(NOT_FOUND_MESSAGE);
          if (order.ord_status === 'CANCELADA')
            throw new BadRequestException(
              'La orden está cancelada: no se pueden registrar resultados',
            );

          // pares examen/parámetro válidos: los de los exámenes de la orden
          const withExams = await manager.findOne(Order, {
            where: { ord_id: dto.order },
            relations: { exams: { parameters: true } },
          });
          const validPairs = new Set(
            (withExams?.exams ?? []).flatMap((exam) =>
              (exam.parameters ?? []).map(
                (param) => `${exam.exa_id}:${param.par_id}`,
              ),
            ),
          );

          const seen = new Set<string>();
          for (const item of dto.results) {
            if (!validPairs.has(`${item.exam}:${item.param}`))
              throw new NotFoundException(NOT_FOUND_MESSAGE);
            if (seen.has(item.param))
              throw new BadRequestException(
                'Un parámetro aparece más de una vez',
              );
            seen.add(item.param);
          }

          const existing = await manager.find(Result, {
            where: { order: { ord_id: dto.order } },
            relations: { param: true },
          });
          const byParam = new Map(
            existing.map((result) => [result.param.par_id, result]),
          );

          const toCreate: BatchResultItemDto[] = [];
          const toUpdate: { result: Result; item: BatchResultItemDto }[] = [];
          let unchanged = 0;
          for (const item of dto.results) {
            const value = item.res_value.trim();
            const current = byParam.get(item.param);
            if (!current) {
              if (value) toCreate.push(item);
              continue;
            }
            const changed =
              (value && value !== current.res_value) ||
              (item.res_observation ?? null) !==
                (current.res_observation ?? null) ||
              (item.res_reference ?? null) !== (current.res_reference ?? null);
            if (changed) toUpdate.push({ result: current, item });
            else unchanged++;
          }

          // registrar exige "crear" y corregir exige "editar" resultados
          if (toCreate.length && !hasPermission(actor, 'results:create'))
            throw new ForbiddenException(
              'No tiene permiso para registrar resultados',
            );
          if (toUpdate.length && !hasPermission(actor, 'results:update'))
            throw new ForbiddenException(
              'No tiene permiso para corregir resultados',
            );

          const by = { use_id: actor.use_id } as User;
          if (toCreate.length) {
            await manager.save(
              Result,
              toCreate.map((item) =>
                manager.create(Result, {
                  res_value: item.res_value.trim(),
                  res_observation: item.res_observation ?? null,
                  res_reference: item.res_reference ?? null,
                  order: { ord_id: dto.order },
                  exam: { exa_id: item.exam },
                  param: { par_id: item.param },
                  registeredBy: by,
                  updatedBy: by,
                }),
              ),
            );
          }
          for (const { result, item } of toUpdate) {
            await manager.update(
              Result,
              { res_id: result.res_id },
              {
                res_value: item.res_value.trim() || result.res_value,
                res_observation: item.res_observation ?? null,
                res_reference: item.res_reference ?? null,
                updatedBy: by,
              },
            );
          }

          if (toCreate.length || toUpdate.length) {
            await manager.update(
              Order,
              { ord_id: dto.order },
              { ord_status: 'PENDIENTE PDF' },
            );
          }

          return {
            created: toCreate.length,
            updated: toUpdate.length,
            unchanged,
          };
        },
      );

      const saved = summary.created + summary.updated;
      return {
        status: 200,
        message: saved
          ? `Se guardaron ${saved} ${saved === 1 ? 'resultado' : 'resultados'}`
          : 'No había cambios para guardar',
        data: summary,
        // se guarda igual, pero el PDF saldrá sin su firma
        warning:
          saved && !actor.use_firma_path
            ? 'Aún no tienes firma cargada: los exámenes que firmes saldrán sin ella. Cárgala en Mi perfil.'
            : undefined,
      };
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
        relations: {
          order: true,
          exam: true,
          param: true,
        },
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
  async update(
    id: string,
    lab_id: string,
    updateResultDto: UpdateResultDto,
    actor?: User,
  ) {
    try {
      // el resultado debe pertenecer a una orden del laboratorio del usuario
      const current = await this.resultRepository.findOne({
        where: { res_id: id, order: { laboratory: { lab_id } } },
        relations: {
          order: true,
          exam: true,
          param: true,
        },
      });

      if (!current)
        throw new NotFoundException(
          'No existe un resultado con el ID proporcionado',
        );

      // si no se envían, se conservan la orden, el examen y el parámetro actuales
      const ord_id = updateResultDto.order ?? current.order.ord_id;
      const exa_id = updateResultDto.exam ?? current.exam.exa_id;
      const par_id = updateResultDto.param ?? current.param.par_id;

      if (ord_id !== current.order.ord_id)
        await this.orderService.assertOrderInLaboratory(ord_id, lab_id);
      if (exa_id !== current.exam.exa_id || par_id !== current.param.par_id) {
        await this.assertParamInLaboratory(exa_id, par_id, lab_id);
      }

      // Pre-cargamos el resultado a actualizar
      const result = await this.resultRepository.preload({
        res_id: id,
        ...updateResultDto,
        order: { ord_id },
        exam: { exa_id },
        param: { par_id },
        // trazabilidad: quién lo modificó por última vez
        ...(actor ? { updatedBy: { use_id: actor.use_id } } : {}),
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
