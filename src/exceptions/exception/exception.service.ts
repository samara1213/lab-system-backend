import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

@Injectable()
export class ExceptionService {

  /**
   * Funcion que se encarga de manejar los errores de la base de datos
   * @param error Error capturado
   * @returns Error manejado
   */
  handleDBError(error: any) {

    console.error('Database Error:', error);
    if (error.code === '23505') {

      throw new ConflictException('el registro ya existe en la base de datos');
    
    } else if (error.status === 400 || error.status === 404) {

      throw new BadRequestException(error.response.message);
    
    } else {

      throw new InternalServerErrorException('En este momento no logramos procesar su solicitud, por favor intente más tarde');
    
    }
  }
}
