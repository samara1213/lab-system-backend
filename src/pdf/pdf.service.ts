import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class PdfService {
    
  constructor(
    private readonly storageService: StorageService,
    private readonly exceptionService: ExceptionService, 
  ){}

  async generateExamResultsPdf(orderResults: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: 'letter' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    // Obtener buffer de la firma si existe
    let bufferFirma: Buffer | null = null;
    if (orderResults.laboratory?.lab_signature) {
      try {
        bufferFirma = await this.storageService.getPrivateImageBuffer(`logos_empresa/${orderResults.laboratory.lab_signature}`);
      } catch (e) {
        bufferFirma = null;
      }
    }

    // Encabezado con logo y datos del laboratorio
    if (orderResults.laboratory?.lab_logo) {
      try {
        const bufferLogo = await this.storageService.getPrivateImageBuffer(`logos_empresa/${orderResults.laboratory.lab_logo}`);
        // Ancho total de la página menos márgenes (A4: 595.28pt, margen 40)        
        doc.image(bufferLogo, 40, 30, { width: 515 }); 
    
      } catch (e) {
        // aca si no carga la imagen no se detenga
       
      }
    } else {
        // Si no hay logo, colocaos los datos del laboratorio en la parte superior
        doc.fontSize(20).text(orderResults.laboratory?.lab_name || 'Laboratorio', 140, 40, { align: 'left' });
        doc.fontSize(10).text(`NIT: ${orderResults.laboratory?.lab_nit || ''}-${orderResults.laboratory?.lab_dv || ''}`, 140, 65);
        doc.fontSize(10).text(`Dirección: ${orderResults.laboratory?.lab_address || ''}`, 140, 80);
        doc.fontSize(10).text(`Teléfono: ${orderResults.laboratory?.lab_phone || ''}`, 140, 95);
    }
    
    doc.moveDown(5);

    // Ajuste: Mostrar fechas con zona horaria America/Bogota
    // Restar 5 horas a la fecha de ingreso
    let fechaIngreso = '';
    if (orderResults.ord_created_at) {
      const fechaOriginal = new Date(orderResults.ord_created_at);
      fechaOriginal.setHours(fechaOriginal.getHours() - 5);
      fechaIngreso = fechaOriginal.toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    }    
    const fechaGeneracion = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    // Datos del paciente y orden en dos columnas
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Paciente:', 40, 140); doc.font('Helvetica').text(`${orderResults.customer?.cus_first_name || ''} ${orderResults.customer?.cus_second_name || ''} ${orderResults.customer?.cus_first_lastname || ''} ${orderResults.customer?.cus_second_lastname || ''}`, 110, 140);
    doc.font('Helvetica-Bold').text('N° de orden:', 310, 140); doc.font('Helvetica').text(`${orderResults.ord_code || ''}`, 430, 140);

    doc.font('Helvetica-Bold').text('Doc. Id:', 40, 160); doc.font('Helvetica').text(`${orderResults.customer?.cus_document_number || ''}`, 110, 160);
    doc.font('Helvetica-Bold').text('Fecha de Ingreso:', 310, 160); doc.font('Helvetica').text(`${fechaIngreso}`, 430, 160);

    // Calcula edad
    const birth = orderResults.customer?.cus_birthdate ? new Date(orderResults.customer.cus_birthdate) : null;
    let edad = '';
    if (birth) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      let days = now.getDate() - birth.getDate();
      if (days < 0) { months--; days += 30; }
      if (months < 0) { years--; months += 12; }
      edad = `${years} años, ${months} meses, ${days} días`;
    }
    doc.font('Helvetica-Bold').text('Edad:', 40, 180); doc.font('Helvetica').text(edad, 110, 180);
    doc.font('Helvetica-Bold').text('Genero:', 310, 180); doc.font('Helvetica').text(`${orderResults.customer?.cus_gender || ''}`, 430, 180);

    doc.font('Helvetica-Bold').text('Medico:', 40, 200); // Puedes agregar el nombre si lo tienes
    doc.font('Helvetica-Bold').text('Pag No.', 310, 200); doc.font('Helvetica').text('1 de 1', 430, 200);

    doc.font('Helvetica-Bold').text('Fecha Generacion:', 310, 220); doc.font('Helvetica').text(fechaGeneracion, 430, 220);
  
    doc.moveDown(1);    
    // Consultar los adjuntos antes de recorrer los exámenes y obtener sus buffers
    const attachedFiles = Array.isArray(orderResults.attachedFiles) ? orderResults.attachedFiles : [];
    const attachedBuffers: { file: any, buffer: Buffer | null, ext: string }[] = [];
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
      attachedBuffers.push({ file: attached, buffer, ext });
    }

    // Ordenar los exámenes para que hemograma siempre sea el primero
    let exams = orderResults.exams ?? [];
    if (exams.length > 1) {
      const hemogramaIndex = exams.findIndex((ex: any) => typeof ex.exa_name === 'string' && ex.exa_name.toLowerCase().includes('hemograma'));
      if (hemogramaIndex > -1) {
        const hemogramaExam = exams[hemogramaIndex];
        exams = exams.filter((_, idx) => idx !== hemogramaIndex);
        exams = [hemogramaExam, ...exams];
      }
    }
    // Resultados por examen/sección
    exams.forEach((exam: any) => {
      // Variable local para observaciones únicas
      const uniqueObservations = new Set<string>();
      // Título de sección con fondo azul
      if (doc.y + 80 > doc.page.height) {
        doc.addPage();
      }
      const sectionY = doc.y;
      doc.save();
      doc.rect(40, sectionY, 500, 20).fill('#0074b7');
      doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text(exam.exa_name.toUpperCase(), 45, sectionY + 4, { width: 490, align: 'center' });
      doc.restore();
      doc.moveDown(0.5);
      // Encabezado de tabla
      const tableY = doc.y;
      doc.save();
      doc.rect(40, tableY, 500, 18).stroke();
      doc.rect(40, tableY, 140, 18).stroke();
      doc.rect(180, tableY, 100, 18).stroke();
      doc.rect(280, tableY, 100, 18).stroke();
      doc.rect(380, tableY, 160, 18).stroke();
      doc.fillColor('#0074b7').font('Helvetica-Bold');
      doc.text('Examen', 45, tableY + 4, { width: 135, align: 'center' });
      doc.text('Resultado', 185, tableY + 4, { width: 95, align: 'center' });
      doc.text('Unidades', 285, tableY + 4, { width: 95, align: 'center' });
      doc.text('Valores de Referencia', 385, tableY + 4, { width: 155, align: 'center' });
      doc.restore();
      doc.moveDown(0.5);
      // Filas de resultados con borde de tabla más delgado
      doc.font('Helvetica').fillColor('black');
      if (exam.exa_name.toLowerCase().includes('hemograma')) {        
        attachedBuffers.forEach(({ file, buffer, ext }) => {
          // Si es imagen, ubicar lo más a la izquierda respetando el margen
          const marginLeft = doc.page.margins.left;
          const fitWidth = 700;
          const fitHeight = 290;
          const yInicial = doc.y;
          doc.image(buffer, marginLeft, yInicial, { fit: [fitWidth, fitHeight] });
          // Actualiza manualmente doc.y para que el pie de página quede debajo de la imagen
          doc.y = yInicial + fitHeight;
          doc.moveDown(1);
        });
      }
      // Ordenar los parámetros por par_order antes de agregarlos al PDF
      const sortedParameters = exam.parameters?.slice().sort((a: any, b: any) => (a.par_order ?? 0) - (b.par_order ?? 0));
      // Encabezado de tabla para reutilizar en saltos de página
      const pintarEncabezadoTabla = () => {
        const tableY = doc.y;
        doc.save();
        doc.rect(40, tableY, 500, 18).stroke();
        doc.rect(40, tableY, 140, 18).stroke();
        doc.rect(180, tableY, 100, 18).stroke();
        doc.rect(280, tableY, 100, 18).stroke();
        doc.rect(380, tableY, 160, 18).stroke();
        doc.fillColor('#0074b7').font('Helvetica-Bold');
        doc.text('Examen', 45, tableY + 4, { width: 135, align: 'center' });
        doc.text('Resultado', 185, tableY + 4, { width: 95, align: 'center' });
        doc.text('Unidades', 285, tableY + 4, { width: 95, align: 'center' });
        doc.text('Valores de Referencia', 385, tableY + 4, { width: 155, align: 'center' });
        doc.restore();
        doc.moveDown(0.5);
      };
      sortedParameters?.forEach((param: any, idx: number) => {
        // Guardar observaciones únicas en variable local
        if (param.observation && !uniqueObservations.has(param.observation)) {
          uniqueObservations.add(param.observation);
        }
        
        // Si el espacio vertical está cerca del final de la hoja, agrega nueva página y repinta encabezado
        if ((doc.y + 80) > (doc.page.height - 80)) {     
          doc.addPage();
          pintarEncabezadoTabla();
        }
        const rowY = doc.y;
        // Si el nombre del parámetro inicia con '*', centrado y en negrita, sin mostrar valores
        if (typeof param.par_name === 'string' && param.par_name.trim().startsWith('*')) {
          doc.font('Helvetica-Bold').text(param.par_name.replace(/^\*/, '').trim(), 45, rowY + 4, { width: 490, align: 'center' });
          doc.moveDown(0.1);
        } else {
          // No agregar si el resultado es '-' o vacío
          const resultado = param.result ?? '-';
          if (resultado === '-' || resultado === '' || resultado === null) {
            return;
          }
          doc.font('Helvetica');
          doc.save();
          // Ajuste: Si el nombre es muy largo, reduce la fuente y permite salto de línea
          const nombre = param.par_name || '';
          if (nombre.length > 30) {
            doc.fontSize(9);
          } else {
            doc.fontSize(11);
          }
          doc.text(nombre, 45, rowY + 4, {
            width: 135,
            align: 'left',
            lineGap: 1,
            continued: false
          });
          doc.fontSize(11);
          doc.text(resultado, 185, rowY + 4, { width: 95, align: 'center' });
          doc.text(param.par_unit_extent ?? '-', 285, rowY + 4, { width: 95, align: 'center' });
          // Ajuste de valores de referencia
          let referencia = '-';
          if (param.reference !== undefined && param.reference !== null && param.reference !== '') {
            referencia = param.reference;
          } else if (param.par_range) {
            const minMan = param.par_min_man ?? '';
            const maxMan = param.par_max_man ?? '';
            const minWoman = param.par_min_woman ?? '';
            const maxWoman = param.par_max_woman ?? '';
            const minChild = param.par_min_child ?? '';
            const maxChild = param.par_max_child ?? '';
            referencia = '';
            if (minMan !== '' && maxMan !== '') referencia += `Hombres: ${minMan} - ${maxMan}\n`;
            if (minWoman !== '' && maxWoman !== '') referencia += `Mujeres: ${minWoman} - ${maxWoman}\n`;
            if (minChild !== '' && maxChild !== '') referencia += `Niños: ${minChild} - ${maxChild}`;
            referencia = referencia.trim();
          } else {
            referencia = param.par_reference_value ?? '-';
          }
          doc.text(referencia, 385, rowY + 4, { width: 155, align: 'center' });
          doc.restore();
          doc.moveDown(0.1);
        }
      });
      doc.moveDown();      
      // Agregar observaciones únicas al PDF después de los parámetros
      if (uniqueObservations.size > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text('Observaciones:', 45, doc.y, { width: 490, align: 'left' });
        doc.font('Helvetica').fontSize(10).fillColor('black');
        Array.from(uniqueObservations).forEach((obs: string) => {
          doc.text(obs, 45, doc.y, { width: 490, align: 'left' });
        });
        doc.moveDown(0.5);
      }
    });
    
    // Pie de página
    doc.moveDown(2);
    // Agregar la firma alineada a la derecha justo encima del nombre
    if (bufferFirma) {
      // Alinear la firma menos a la derecha (ejemplo: ancho máx 120px, alto máx 60px)
      const firmaWidth = 120;
      const firmaHeight = 60;
      const pageWidth = doc.page.width;
      // Ajusta el margen derecho para que no esté tan pegada
      const margenDerechoExtra = 60;
      const xFirma = pageWidth - firmaWidth - doc.page.margins.right - margenDerechoExtra;
      const yFirma = doc.y;
      doc.image(bufferFirma, xFirma, yFirma, { fit: [firmaWidth, firmaHeight] });
      doc.y = yFirma + firmaHeight;      
    }
    // Nombre y título
    doc.fontSize(10).fillColor('black').text(orderResults.laboratory?.lab_legal_representative || '', { align: 'center' });
    doc.fontSize(10).fillColor('black').text('BACTERIOLOGO - UIS', { align: 'center' });

    doc.end();

    // Eliminar lógica de guardado local, solo retornar el buffer generado
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
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

        // agregamos el nombre del archivo y lo subimos al almacenamiento
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
}
