import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ExceptionService } from 'src/exceptions/exception/exception.service';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class PdfService {
    
  constructor(
    private readonly storageService: StorageService,
    private readonly exceptionService: ExceptionService, 
  ){}

  async generateExamResultsPdf(orderResults: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

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

    // Datos del paciente y orden en dos columnas
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Paciente:', 40, 140); doc.font('Helvetica').text(`${orderResults.customer?.cus_first_name || ''} ${orderResults.customer?.cus_second_name || ''} ${orderResults.customer?.cus_first_lastname || ''} ${orderResults.customer?.cus_second_lastname || ''}`, 110, 140);
    doc.font('Helvetica-Bold').text('N° de orden:', 310, 140); doc.font('Helvetica').text(`${orderResults.ord_code || ''}`, 430, 140);

    doc.font('Helvetica-Bold').text('Doc. Id:', 40, 160); doc.font('Helvetica').text(`${orderResults.customer?.cus_document_number || ''}`, 110, 160);
    doc.font('Helvetica-Bold').text('Fecha de Ingreso:', 310, 160); doc.font('Helvetica').text(`${orderResults.ord_created_at ? new Date(orderResults.ord_created_at).toLocaleString() : ''}`, 430, 160);

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

    doc.font('Helvetica-Bold').text('Fecha Generacion:', 310, 220); doc.font('Helvetica').text(new Date().toLocaleString(), 430, 220);

    doc.moveDown(1);

    // Resultados por examen/sección
    orderResults.exams?.forEach((exam: any) => {
      // Título de sección con fondo azul
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
      exam.parameters?.forEach((param: any) => {
        const rowY = doc.y;
        doc.save();   
        doc.text(param.par_name, 45, rowY + 4, { width: 135 });
        doc.text(param.result ?? '-', 185, rowY + 4, { width: 95 });
        doc.text(param.par_unit_extent ?? '-', 285, rowY + 4, { width: 95 });
        // Ajuste de valores de referencia
        let referencia = '-';
        if (param.par_range) {
          const minMan = param.par_min_man ?? '';
          const maxMan = param.par_max_man ?? '';
          const minWoman = param.par_min_woman ?? '';
          const maxWoman = param.par_max_woman ?? '';
          const minChild = param.par_min_child ?? '';
          const maxChild = param.par_max_child ?? '';
          referencia = '';
          if (minMan !== '' && maxMan !== '') referencia += `Hombres: ${minMan} - ${maxMan}\n`;
          if (minWoman !== '' && maxWoman !== '') referencia += `Mujeres: ${minWoman} - ${maxWoman}\n`;
          if (minChild !== '' && maxChild !== '') referencia += `Ñiños: ${minChild} - ${maxChild}`;
          referencia = referencia.trim();
        } else {
          referencia = param.par_reference_value ?? '-';
        }
        doc.text(referencia, 385, rowY + 4, { width: 155 });
        doc.restore();
        doc.moveDown(0.1);
      });
      doc.moveDown();
    });

    // Pie de página
    doc.moveDown(2);
    doc.fontSize(10).fillColor('black').text(orderResults.laboratory?.lab_legal_representative || '', { align: 'center' });
    doc.fontSize(10).fillColor('black').text('BACTERIOLOGO', { align: 'center' });

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
}
