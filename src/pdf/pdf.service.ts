import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { StorageService } from '../storage/storage.service';
import { PdfRendererService } from './engine/pdf-renderer.service';
import {
  CompiledTemplate,
  TemplateResolverService,
} from './engine/template-resolver.service';
import { splitLayout } from './engine/template-engine';
import {
  buildResultReport,
  ReportImages,
  ResultReport,
} from './report/result-report.builder';

// logos y firmas se reutilizan unos minutos entre PDF (sus rutas no cambian de contenido)
const IMAGE_CACHE_TTL_MS = 10 * 60_000;
const MAX_CACHED_IMAGES = 100;

/**
 * Tipo de imagen según sus primeros bytes (no según la extensión del archivo)
 */
function imageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return 'image/jpeg';
  if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger('PdfService');
  private readonly imageCache = new Map<
    string,
    { value: string | null; expires: number }
  >();

  constructor(
    private readonly storageService: StorageService,
    private readonly exceptionService: ExceptionService,
    private readonly renderer: PdfRendererService,
    private readonly templates: TemplateResolverService,
  ) {}

  /**
   * Genera el PDF de resultados de una orden con la plantilla de su laboratorio y lo sube
   * a `<lab_id>/resultados/<ord_id>/<uuid>.pdf` (cada versión con su propio nombre)
   * @param orderResults orden con resultados (OrdersService.findOrderWithResults)
   * @returns ruta del PDF en el bucket
   */
  async generateResult(orderResults: any): Promise<string> {
    try {
      const lab_id = orderResults.laboratory.lab_id;
      const [images, template] = await Promise.all([
        this.loadImages(orderResults),
        this.templates.forLaboratory(lab_id),
      ]);
      const pdfBuffer = await this.renderReport(
        template,
        buildResultReport(orderResults, images),
      );

      const fileName = `${lab_id}/resultados/${orderResults.ord_id}/${randomUUID()}.pdf`;
      return await this.storageService.uploadFile(
        pdfBuffer,
        fileName,
        'application/pdf',
        false,
      );
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Imprime los datos de un reporte con una plantilla
   * @param template plantilla compilada
   * @param report datos del reporte
   * @returns PDF
   */
  async renderReport(
    template: CompiledTemplate,
    report: ResultReport,
  ): Promise<Buffer> {
    return this.renderer.render(splitLayout(template(report)));
  }

  /**
   * Logo de un laboratorio como data: (para la vista previa de plantillas)
   * @param lab_logo nombre del archivo del logo
   */
  async labLogo(lab_logo?: string | null): Promise<string | null> {
    return lab_logo
      ? this.imageDataUri(`logos_empresa/${lab_logo}`, true)
      : null;
  }

  /**
   * Descarga en paralelo el logo, la firma del laboratorio, las firmas de los
   * profesionales y las imágenes adjuntas a la orden
   */
  private async loadImages(order: any): Promise<ReportImages> {
    const lab = order.laboratory ?? {};
    const signaturePaths = [
      ...new Set<string>(
        (order.exams ?? [])
          .map((exam: any) => exam.signer?.firma_path)
          .filter(Boolean),
      ),
    ];
    const attachedPaths: string[] = (order.attachedFiles ?? [])
      .map((attached: any) => attached.att_file_url)
      .filter(Boolean);

    const [logo, labSignature, signatures, attachments] = await Promise.all([
      this.labLogo(lab.lab_logo),
      lab.lab_signature
        ? this.imageDataUri(`logos_empresa/${lab.lab_signature}`, true)
        : null,
      Promise.all(
        signaturePaths.map(async (path) => [
          path,
          await this.imageDataUri(path, true),
        ]),
      ),
      Promise.all(attachedPaths.map((path) => this.imageDataUri(path, false))),
    ]);

    return {
      logo,
      labSignature,
      signatures: new Map(signatures as [string, string | null][]),
      // los adjuntos que no son imagen (PDF) no se incrustan
      attachments: attachments.filter(Boolean),
    };
  }

  /**
   * Imagen del bucket como data: (null si no existe o no es una imagen)
   * @param path ruta en el bucket
   * @param useCache reutilizarla unos minutos (logos y firmas)
   */
  private async imageDataUri(
    path: string,
    useCache: boolean,
  ): Promise<string | null> {
    const cached = useCache ? this.imageCache.get(path) : undefined;
    if (cached && cached.expires > Date.now()) return cached.value;

    let value: string | null = null;
    try {
      const buffer = await this.storageService.getPrivateImageBuffer(path);
      const mime = imageMime(buffer);
      value = mime ? `data:${mime};base64,${buffer.toString('base64')}` : null;
    } catch {
      // sin la imagen el PDF se genera igual
      this.logger.warn('No se pudo descargar una imagen para el PDF');
    }

    if (useCache) {
      if (this.imageCache.size >= MAX_CACHED_IMAGES)
        this.imageCache.delete(this.imageCache.keys().next().value);
      this.imageCache.set(path, {
        value,
        expires: Date.now() + IMAGE_CACHE_TTL_MS,
      });
    }
    return value;
  }

  /**
   * Sube un adjunto al storage con un nombre generado por el servidor
   * @param buffer contenido del archivo ya validado
   * @param lab_id id del laboratorio dueño del archivo
   * @param fileType extension y mimetype detectados del contenido
   * @returns ruta del archivo en el storage
   */
  async uploadFileBuffer(
    buffer: Buffer,
    lab_id: string,
    fileType: { ext: string; mime: string },
  ): Promise<string> {
    try {
      // nombre unico; nunca se usa el nombre original enviado por el cliente
      const fileName = `${lab_id}/adjuntos/${randomUUID()}.${fileType.ext}`;
      // Sube el archivo al storage con su tipo real
      const urlResult = await this.storageService.uploadFile(
        buffer,
        fileName,
        fileType.mime,
      );

      return urlResult;
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }
}
