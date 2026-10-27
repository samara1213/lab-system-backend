import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { describeError } from './safe-error.helper';

@Injectable()
export class ExceptionService {
  private readonly logger = new Logger('ExceptionService');

  /**
   * Funcion que se encarga de manejar los errores de la base de datos
   * @param error Error capturado
   * @returns Error manejado
   */
  handleDBError(error: any) {
    // las excepciones HTTP ya construidas (404, 403, 409...) se propagan sin cambios
    if (error instanceof HttpException) throw error;

    // se registra sin parametros de la consulta (pueden traer datos de pacientes)
    this.logger.error(describeError(error), error?.stack);

    if (error.code === '23505') {
      throw new ConflictException('el registro ya existe en la base de datos');
    } else {
      throw new InternalServerErrorException(
        'En este momento no logramos procesar su solicitud, por favor intente más tarde',
      );
    }
  }
}
