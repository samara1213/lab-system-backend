// ...existing code...
import { Injectable } from '@nestjs/common';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { StorageService } from '../storage/storage.service';


@Injectable()
export class PdfService {
  constructor(
    private readonly storageService: StorageService,
    private readonly exceptionService: ExceptionService, 
  ){}

  async generateExamResultsPdf(orderResults: any): Promise<Buffer> {
    
    // 1. Cargar la plantilla HTML
    const fs = await import('fs/promises');
    const path = await import('path');
    const Handlebars = (await import('handlebars')).default;
    const puppeteer = (await import('puppeteer')).default;

    // Registrar helpers para startsWith y substring
    if (!Handlebars.helpers.startsWith) {
      Handlebars.registerHelper('startsWith', function(str: string, prefix: string) {
        return typeof str === 'string' && str.startsWith(prefix);
      });
    }
    if (!Handlebars.helpers.substring) {
      Handlebars.registerHelper('substring', function(str: string, start: number) {
        return typeof str === 'string' ? str.substring(start) : str;
      });
    }
    if (!Handlebars.helpers.eq) {
      Handlebars.registerHelper('eq', function(a: any, b: any) {
        return a === b;
      });
    }
    if (!Handlebars.helpers.or) {
      Handlebars.registerHelper('or', function() {
        const args = Array.prototype.slice.call(arguments, 0, -1);
        return args.some(Boolean);
      });
    }
        if (!Handlebars.helpers.and) {
      Handlebars.registerHelper('and', function() {
        const args = Array.prototype.slice.call(arguments, 0, -1);
        return args.every(Boolean);
      });
    }
    if (!Handlebars.helpers.not) {
      Handlebars.registerHelper('not', function(value: any) {
        return !value;
      });
    }
    if (!Handlebars.helpers.contains) {
      Handlebars.registerHelper('contains', function(str: string, substr: string) {
        return typeof str === 'string' && str.toLowerCase().includes(substr.toLowerCase());
      });
    }
    if (!Handlebars.helpers.toLowerCase) {
      Handlebars.registerHelper('toLowerCase', function(str: string) {
        return typeof str === 'string' ? str.toLowerCase() : str;
      });
    }

    // Usar ruta relativa a __dirname para producción y src para desarrollo
    let templateHtml = '';
    let templatePath = '';
    if (__dirname.includes('dist')) {
      templatePath = path.resolve(__dirname, './templates/result-header.html');
    } else {
      templatePath = path.resolve(process.cwd(), 'src/pdf/templates/result-header.html');
    }    
    try {
      templateHtml = await fs.readFile(templatePath, 'utf8');
    } catch (e) {
      throw new Error('No se encontró la plantilla result-header.html en: ' + templatePath);
    }

    // 2. Prepara los datos para la plantilla
    let edad = '';
    const birth = orderResults.customer?.cus_birthdate ? new Date(orderResults.customer.cus_birthdate) : null;
    if (birth) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      let days = now.getDate() - birth.getDate();
      if (days < 0) { months--; days += 30; }
      if (months < 0) { years--; months += 12; }
      edad = `${years} años, ${months} meses, ${days} días`;
    }
    const fechaOriginal = new Date(orderResults.ord_created_at);
    const fechaIngreso = fechaOriginal.toLocaleString('es-CO', { timeZone: 'America/Bogota' });       
    const fechaGeneracion = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });


    // 2.1. Convertir logo a base64 si existe
    let labLogoBase64 = '';
    if (orderResults.laboratory?.lab_logo) {
      try {
        const logoBuffer = await this.storageService.getPrivateImageBuffer(`logos_empresa/${orderResults.laboratory.lab_logo}`);
        const ext = orderResults.laboratory.lab_logo.split('.').pop()?.toLowerCase() || 'png';
        labLogoBase64 = `data:image/${ext};base64,${logoBuffer.toString('base64')}`;
      } catch (e) {
        labLogoBase64 = '';
      }
    }

    const attachedFiles = Array.isArray(orderResults.attachedFiles) ? orderResults.attachedFiles : [];
    const hemogramaImages: string[] = [];
    for (const attached of attachedFiles) {
      let buffer = null;
      let ext = '';
      try {
        buffer = await this.storageService.getPrivateImageBuffer(attached.att_file_url);
        ext = attached.att_file_url.split('.').pop()?.toLowerCase() || '';
      } catch (e) {
        buffer = null;
        ext = attached.att_file_url.split('.').pop()?.toLowerCase() || '';
      }
      // Solo agregar si es imagen y buffer válido
      if (buffer && ['png','jpg','jpeg','gif','bmp','webp'].includes(ext)) {
        hemogramaImages.push(`data:image/${ext};base64,${buffer.toString('base64')}`);
      }
    }

    let labSignatureBase64 = '';
    if (orderResults.laboratory?.lab_signature) {
      try {
        const bufferFirma = await this.storageService.getPrivateImageBuffer(`logos_empresa/${orderResults.laboratory.lab_signature}`);
        const extFirma = orderResults.laboratory.lab_signature.split('.').pop()?.toLowerCase() || 'png';
        labSignatureBase64 = `data:image/${extFirma};base64,${bufferFirma.toString('base64')}`;
      } catch (e) {
        labSignatureBase64 = '';
      }
    }

    // 2.2. Agrupar y deduplicar clasificaciones de exámenes
    // Mapeo de nombres de clasificación
    const classificationNames: Record<number, string> = {
      '1': 'HEMATOLOGIA',
      '2': 'HEMATOLOGIA',
      '3': 'QUIMICA',
      '4': 'INMUNOLOGIA',
      '5': 'MICROSCOPIA',
      '6': 'MACROSCOPIA',
      '7': 'MICROBIOLOGIA',
      '8': 'HORMONAS',
    };
    let uniqueClassifications: any[] = [];
    if (Array.isArray(orderResults.exams)) {
      const seen = new Set();
      for (const exam of orderResults.exams) {
        if (!seen.has(exam.exa_classification)) {
          seen.add(exam.exa_classification);
          const exams = orderResults.exams
            .filter((e: any) => e.exa_classification === exam.exa_classification)
            .map((ex: any) => {
              const sortedParams = Array.isArray(ex.parameters)
                ? [...ex.parameters].sort((a, b) => (a.par_order ?? 0) - (b.par_order ?? 0))
                : ex.parameters;
              // Extraer observaciones únicas de los parámetros
              const uniqueObservations = [
                ...new Set(
                  (Array.isArray(sortedParams)
                    ? sortedParams
                    : []
                  )
                    .map((p: any) => p.observation)
                    .filter((obs: any) => !!obs && obs.trim() !== '')
                ),
              ];
              return {
                ...ex,
                parameters: sortedParams,
                uniqueObservations,
              };
            });
          // Si es hemograma, agrega las imágenes
          const isHemograma = [1].includes(Number(exam.exa_classification));
          uniqueClassifications.push({
            classification_id: exam.exa_classification,
            classification: classificationNames[exam.exa_classification] || exam.exa_classification,
            exams,
            images: isHemograma ? hemogramaImages : undefined
          });
        }
      }
      // Ordenar de menor a mayor por classification_id
      uniqueClassifications.sort((a, b) => a.classification_id - b.classification_id);
    }

    // 3. Renderizar HTML con Handlebars
    const template = Handlebars.compile(templateHtml);
    const html = template({
      ...orderResults,
      cus_full_name: `${orderResults.customer?.cus_first_name || ''} ${orderResults.customer?.cus_second_name || ''} ${orderResults.customer?.cus_first_lastname || ''} ${orderResults.customer?.cus_second_lastname || ''}`.replace(/\s+/g, ' ').trim(),
      cus_document_number: orderResults.customer?.cus_document_number || '',
      cus_age: edad,
      cus_gender: orderResults.customer?.cus_gender || '',
      ord_code: orderResults.ord_code || '',
      ord_created_at: fechaIngreso,
      fecha_generacion: fechaGeneracion,
      page_number: 1, // Puedes ajustar la paginación si lo necesitas
      lab_logo: labLogoBase64,
      lab_name: orderResults.laboratory?.lab_name || '',
      lab_address: orderResults.laboratory?.lab_address || '',
      lab_phone: orderResults.laboratory?.lab_phone || '',
      lab_email: orderResults.laboratory?.lab_email || '',
      lab_signer_name: orderResults.laboratory?.lab_legal_representative || '',
      lab_signer_role: orderResults.laboratory?.lab_signer_role || '', 
      lab_signature_base64: labSignatureBase64,
      uniqueClassifications,
      labSignatureBase64,
      edad,
      fechaIngreso,
      fechaGeneracion,
    }); 

    // obtener encabezado para paginas
    const templateHeaderHtml = this.getReportHeaderHtml(orderResults, edad, fechaIngreso, fechaGeneracion, labLogoBase64);
    // 4. Generar PDF con Puppeteer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'letter', 
                                       printBackground: true,
                                       margin: { top: '295px', 
                                                 bottom: '40px', 
                                                 left: '40px', 
                                                 right: '40px' },
                                      displayHeaderFooter: true,
                                      headerTemplate: templateHeaderHtml,
                                      footerTemplate: `<div></div>`});
    await browser.close();
    // Asegura que el resultado sea un Buffer (Node.js)
    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  }
  
  
  /**
   * Metodo para generar el PDF de resultados de exámenes y subirlo al almacenamiento
   * @param orderResults datos de los resultados
   * @returns url del archivo PDF generado
   */
  async generateResult(orderResults: any): Promise<string> {

    try {
        // ontener el buffer del PDF generado
        const pdfBuffer = await this.generateExamResultsPdf(orderResults);

        //agregamos el nombre del archivo y lo subimos al almacenamiento
        const fileName = `laboartorio=${orderResults.laboratory.lab_nit}/${orderResults.customer.cus_document_number}/resultados-${orderResults.ord_id}.pdf`;

        // Subir el buffer del PDF al servicio de almacenamiento
        const urlResult = await this.storageService.uploadFile(pdfBuffer, fileName);
    
        return urlResult; 

    } catch (error) {
        
        this.exceptionService.handleDBError(error);
    }

  }

  /**
   * Recibe un archivo, lo sube al storage y retorna la url y el nombre original
   * @param file archivo recibido
   * @returns objeto con url y nombre
   */
  async uploadFileBuffer(file: Express.Multer.File): Promise<string> {
    try {
      // Define el nombre del archivo para el storage
      const fileName = `adjuntos/${Date.now()}-${file.originalname}`;
      // Sube el archivo al storage
      const urlResult = await this.storageService.uploadFile(file.buffer, fileName);

      return urlResult;

    } catch (error) {
      this.exceptionService.handleDBError(error);

    }
  }
  
  /**
   * Devuelve el header HTML para el reporte de resultados de laboratorio
   * @param orderResults objeto completo de la orden
   * @param edad string de edad calculada
   * @param fechaIngreso string de fecha de ingreso
   * @param fechaGeneracion string de fecha de generación
   * @param labLogoBase64 string base64 del logo
   * @returns string HTML del header
   */
  getReportHeaderHtml(orderResults: any, edad: string, fechaIngreso: string, fechaGeneracion: string, labLogoBase64: string): string {
    const lab = orderResults.laboratory || {};
    const customer = orderResults.customer || {};
    return `
      <style>
        .header-outer {
          width: 80%;
          box-sizing: border-box;
          margin: 0 auto;
          padding-left: 0;
          padding-right: 0;
        }
        .header {
          font-family: 'Segoe UI', sans-serif;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          height: 100px;
        }
        .logo {
          height: 100px;
          width: 150px;
          object-fit: contain;
        }
        .lab-info {
          text-align: right;
          font-size: 12px;
          line-height: 1.4;
        }
        .titulo {
          text-align: center;
          font-size: 18px;
          margin-top: 20px;
          margin-bottom: 20px;
          color: #2980b9;
        }
        .info-paciente {
          font-size: 12px;
          background: #90c3f9;
          padding: 12px;
          border-radius: 8px;
          border-top: 2px;
          margin-bottom: 25px;
        }
        .info-paciente-flex {
          display: flex;
          flex-direction: row;
          gap: 32px;
          justify-content: flex-start;
        }
        .info-col {
          flex: 1 1 0;
          min-width: 180px;
        }
      </style>
      <div class="header-outer">
        <div class="header">
          <img src="${labLogoBase64}" class="logo" />
          <div class="lab-info">
            <strong>${lab.lab_name}</strong><br />        
            Dir: ${lab.lab_address}<br />
            Tel: ${lab.lab_phone}<br />
            Email: ${lab.lab_email}
          </div>
        </div>
        <div class="info-paciente">
          <div class="info-paciente-flex">
            <div class="info-col">
              <strong>Paciente:</strong> ${customer.cus_first_name} ${customer.cus_second_name} ${customer.cus_first_lastname} ${customer.cus_second_lastname}<br />
              <strong>Documento:</strong> ${customer.cus_document_type} ${customer.cus_document_number}<br />
              <strong>Fecha de nacimiento:</strong> ${customer.cus_birthdate}<br />
              <strong>Edad:</strong> ${edad}<br />
              <strong>Genero:</strong> ${customer.cus_gender}<br />
            </div>
            <div class="info-col">
              <strong>Teléfono:</strong> ${customer.cus_phone}<br />
              <strong>Orden:</strong> ${orderResults.ord_code} <br />
              <strong>Fecha de ingreso:</strong> ${fechaIngreso}<br />
              <strong>Fecha de generación:</strong> ${fechaGeneracion}<br />
            </div>
          </div>
        </div>
        <div class="titulo">Resultados de Laboratorio</div>
      </div>
    `;
  }
}
