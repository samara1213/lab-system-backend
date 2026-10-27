import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExceptionService } from '../exceptions/exception/exception.service';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger('StorageService');

  constructor(private readonly exceptionService: ExceptionService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  /**
   * Sube un archivo al bucket
   * @param buffer contenido
   * @param fileName ruta dentro del bucket
   * @param contentType tipo real del archivo
   * @param upsert reemplazar si ya existe (las rutas con uuid no lo necesitan)
   * @returns ruta del archivo en el bucket
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string = 'application/pdf',
    upsert: boolean = true,
  ): Promise<string | null> {
    const bucket = process.env.SUPABASE_BUCKET!;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert,
      });

    if (error) {
      this.exceptionService.handleDBError(error);
    }
    // Retorna la ruta del archivo en el bucket
    return data?.path || null;
  }

  /**
   * Obtiene el buffer de una imagen privada almacenada en Supabase Storage
   * @param filePath Ruta del archivo en el bucket
   * @returns Buffer de la imagen
   */
  async getPrivateImageBuffer(filePath: string): Promise<Buffer> {
    const bucket = process.env.SUPABASE_BUCKET!;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(filePath);
    if (error || !data) {
      throw new Error(
        'No se pudo descargar la imagen privada de Supabase Storage',
      );
    }
    // data es un ReadableStream, convertir a Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Genera una URL temporal (signed URL) para descargar un archivo privado de Supabase Storage
   * @param filePath Ruta del archivo en el bucket
   * @param expiresIn Segundos de validez de la URL (por defecto 1 hora)
   * @returns URL temporal para descarga
   */
  async getSignedUrl(
    filePath: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const bucket = process.env.SUPABASE_BUCKET!;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    if (error || !data?.signedUrl) {
      throw new Error('No se pudo generar la URL temporal para el archivo');
    }
    return data.signedUrl;
  }

  /**
   * Elimina un archivo del bucket. Si falla solo se registra: un archivo huérfano
   * no debe impedir la operación que lo reemplazó
   * @param filePath ruta del archivo en el bucket
   */
  async deleteFile(filePath: string): Promise<void> {
    const bucket = process.env.SUPABASE_BUCKET!;
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([filePath]);
    if (error) {
      this.logger.warn(
        `No se pudo eliminar un archivo anterior del bucket [${error.name ?? 'error'}]`,
      );
    }
  }
}
