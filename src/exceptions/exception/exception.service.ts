import { ConflictException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ExceptionService {

  /**
   * Funcion que se encarga de manejar los errores de la base de datos
   * @param error Error capturado
   * @returns Error manejado
   */
  handleDBError(error: any) {

    // las excepciones HTTP ya construidas (404, 403, 409...) se propagan sin cambios
    if (error instanceof HttpException) throw error;

    console.error('Database Error:', error);
    if (error.code === '23505') {

      throw new ConflictException('el registro ya existe en la base de datos');

    } else {

      throw new InternalServerErrorException('En este momento no logramos procesar su solicitud, por favor intente más tarde');
    
    }
  }
}
