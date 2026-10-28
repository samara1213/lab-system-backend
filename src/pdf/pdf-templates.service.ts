import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PdfTemplate } from './entities/pdf_template.entity';
import { Laboratory } from '../laboratory/entities/laboratory.entity';
import { User } from '../auth/entities/user.entity';
import { ExceptionService } from '../exceptions/exception/exception.service';
import { NOT_FOUND_MESSAGE } from '../auth/helpers/laboratory-access.helper';
import { PdfService } from './pdf.service';
import {
  CompiledTemplate,
  sha256,
  TemplateResolverService,
} from './engine/template-resolver.service';
import {
  compileTemplate,
  findTemplateErrors,
  MAX_TEMPLATE_SIZE,
  TEMPLATE_HELPERS,
} from './engine/template-engine';
import { buildSampleReport } from './report/sample-report';
import {
  CreatePdfTemplateDto,
  isTemplateFileName,
  UpdatePdfTemplateDto,
} from './dto/pdf-template.dto';

/**
 * Plantillas del PDF de resultados (solo super administrador: módulo global pdf_templates)
 */
@Injectable()
export class PdfTemplatesService {
  constructor(
    @InjectRepository(PdfTemplate)
    private readonly templateRepository: Repository<PdfTemplate>,

    @InjectRepository(Laboratory)
    private readonly laboratoryRepository: Repository<Laboratory>,

    private readonly pdfService: PdfService,
    private readonly resolver: TemplateResolverService,
    private readonly exceptionService: ExceptionService,
  ) {}

  /**
   * Plantillas registradas (sin su contenido)
   * @param laboratory "system", un id de laboratorio o vacío (todas)
   */
  async findAll(laboratory?: string) {
    try {
      const templates = await this.templateRepository.find({
        where:
          laboratory === 'system'
            ? { laboratory: IsNull() }
            : laboratory
              ? { laboratory: { lab_id: laboratory } }
              : {},
        relations: { laboratory: true, createdBy: true },
        order: { tpl_created_at: 'DESC' },
      });
      return {
        status: 200,
        data: templates.map((tpl) => this.toResponse(tpl)),
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Una plantilla con su contenido
   * @param id id de la plantilla
   */
  async findOne(id: string) {
    try {
      const template = await this.getWithContent(id);
      return {
        status: 200,
        data: {
          ...this.toResponse(template),
          tpl_content: template.tpl_content,
        },
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Plantilla base del sistema (punto de partida) y lista de helpers permitidos
   */
  getDefault() {
    try {
      return {
        status: 200,
        data: {
          tpl_content: this.resolver.getDefaultSource(),
          helpers: TEMPLATE_HELPERS,
          max_size: MAX_TEMPLATE_SIZE,
        },
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Registra una plantilla nueva (inactiva). Se valida y se prueba con datos de ejemplo
   * @param actor super administrador que la sube
   * @param file archivo .html
   * @param dto nombre, descripción y laboratorio (vacío = del sistema)
   */
  async create(
    actor: User,
    file: Express.Multer.File,
    dto: CreatePdfTemplateDto,
  ) {
    try {
      const content = this.readTemplateFile(file);
      await this.compileAndTry(content, null);
      if (dto.laboratory) await this.getLaboratory(dto.laboratory);

      const template = this.templateRepository.create({
        tpl_name: dto.tpl_name.trim(),
        tpl_description: dto.tpl_description?.trim() || null,
        tpl_content: content,
        tpl_sha256: sha256(content),
        tpl_size: Buffer.byteLength(content, 'utf8'),
        tpl_active: false,
        laboratory: dto.laboratory ? { lab_id: dto.laboratory } : null,
        createdBy: { use_id: actor.use_id },
      });
      const saved = await this.templateRepository.save(template);

      return {
        status: 201,
        message: 'La plantilla se ha guardado. Actívela para usarla en los PDF',
        data: { tpl_id: saved.tpl_id },
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Vista previa de un archivo aún no guardado, con datos de ejemplo
   * @param file archivo .html
   * @param lab_id laboratorio cuyos datos y logo se muestran (opcional)
   * @returns PDF
   */
  async previewFile(file: Express.Multer.File, lab_id?: string) {
    try {
      const content = this.readTemplateFile(file);
      const laboratory = lab_id ? await this.getLaboratory(lab_id) : null;
      return await this.renderSample(
        await this.compileAndTry(content, laboratory),
        laboratory,
      );
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Vista previa de una plantilla guardada (con los datos de su laboratorio)
   * @param id id de la plantilla
   * @returns PDF
   */
  async previewSaved(id: string) {
    try {
      const template = await this.getWithContent(id);
      const laboratory = template.laboratory
        ? await this.getLaboratory(template.laboratory.lab_id)
        : null;
      return await this.renderSample(
        compileTemplate(template.tpl_content),
        laboratory,
      );
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Cambia el nombre o la descripción
   */
  async update(id: string, dto: UpdatePdfTemplateDto) {
    try {
      await this.getOrFail(id);
      await this.templateRepository.update(
        { tpl_id: id },
        {
          ...(dto.tpl_name !== undefined && { tpl_name: dto.tpl_name.trim() }),
          ...(dto.tpl_description !== undefined && {
            tpl_description: dto.tpl_description.trim() || null,
          }),
        },
      );
      return {
        status: 200,
        message: 'La plantilla se ha actualizado correctamente',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Activa una plantilla: desde ahora los PDF de su laboratorio (o de los laboratorios
   * sin plantilla propia, si es del sistema) se imprimen con ella
   */
  async activate(id: string) {
    try {
      const template = await this.getOrFail(id);
      const labId = template.laboratory?.lab_id ?? null;

      await this.templateRepository.manager.transaction(async (manager) => {
        const repository = manager.getRepository(PdfTemplate);
        // primero se desactiva la del mismo alcance (índice único parcial)
        await repository.update(
          {
            tpl_active: true,
            laboratory: labId ? { lab_id: labId } : IsNull(),
          },
          { tpl_active: false },
        );
        await repository.update({ tpl_id: id }, { tpl_active: true });
      });

      return {
        status: 200,
        message:
          'La plantilla está activa: los próximos PDF usarán esta plantilla',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Desactiva una plantilla (vuelve a usarse la del sistema o la base)
   */
  async deactivate(id: string) {
    try {
      await this.getOrFail(id);
      await this.templateRepository.update(
        { tpl_id: id },
        { tpl_active: false },
      );
      return {
        status: 200,
        message: 'La plantilla se ha desactivado',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  /**
   * Elimina una plantilla inactiva
   */
  async remove(id: string) {
    try {
      const template = await this.getOrFail(id);
      if (template.tpl_active)
        throw new BadRequestException(
          'Desactive la plantilla antes de eliminarla',
        );
      await this.templateRepository.delete({ tpl_id: id });
      return {
        status: 200,
        message: 'La plantilla se ha eliminado',
      };
    } catch (error) {
      this.exceptionService.handleDBError(error);
    }
  }

  // --- auxiliares ---

  /**
   * Contenido del archivo subido: .html, hasta 256 KB y texto UTF-8 válido
   */
  private readTemplateFile(file: Express.Multer.File): string {
    if (!file?.buffer?.length)
      throw new BadRequestException('Adjunte el archivo .html de la plantilla');
    if (!isTemplateFileName(file.originalname))
      throw new BadRequestException('La plantilla debe ser un archivo .html');
    if (file.size > MAX_TEMPLATE_SIZE)
      throw new BadRequestException('La plantilla supera los 256 KB');
    try {
      return new TextDecoder('utf-8', { fatal: true })
        .decode(file.buffer)
        .replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '');
    } catch {
      throw new BadRequestException(
        'La plantilla debe estar guardada como texto UTF-8',
      );
    }
  }

  /**
   * Valida y compila la plantilla y la prueba con los datos de ejemplo (sin imprimir)
   * @returns plantilla compilada
   */
  private async compileAndTry(
    content: string,
    laboratory: Laboratory | null,
  ): Promise<CompiledTemplate> {
    const errors = findTemplateErrors(content);
    if (errors.length) throw new BadRequestException(errors);
    const compiled = compileTemplate(content);
    try {
      compiled(buildSampleReport(laboratory as any, null));
    } catch (error) {
      throw new BadRequestException(
        `La plantilla falla con los datos de ejemplo: ${String(error?.message ?? error).split('\n')[0]}`,
      );
    }
    return compiled;
  }

  private async renderSample(
    compiled: CompiledTemplate,
    laboratory: Laboratory | null,
  ): Promise<Buffer> {
    const logo = await this.pdfService.labLogo(laboratory?.lab_logo);
    return this.pdfService.renderReport(
      compiled,
      buildSampleReport(laboratory as any, logo),
    );
  }

  private async getLaboratory(lab_id: string): Promise<Laboratory> {
    const laboratory = await this.laboratoryRepository.findOne({
      where: { lab_id },
    });
    if (!laboratory) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return laboratory;
  }

  private async getOrFail(id: string): Promise<PdfTemplate> {
    const template = await this.templateRepository.findOne({
      where: { tpl_id: id },
      relations: { laboratory: true, createdBy: true },
    });
    if (!template) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return template;
  }

  private async getWithContent(id: string): Promise<PdfTemplate> {
    const template = await this.templateRepository
      .createQueryBuilder('tpl')
      .addSelect('tpl.tpl_content')
      .leftJoinAndSelect('tpl.laboratory', 'laboratory')
      .leftJoinAndSelect('tpl.createdBy', 'createdBy')
      .where('tpl.tpl_id = :id', { id })
      .getOne();
    if (!template) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return template;
  }

  // solo los datos necesarios del laboratorio y de quien la subió
  private toResponse(template: PdfTemplate) {
    const { laboratory, createdBy, tpl_content: _content, ...data } = template;
    return {
      ...data,
      laboratory: laboratory
        ? { lab_id: laboratory.lab_id, lab_name: laboratory.lab_name }
        : null,
      created_by: createdBy
        ? [createdBy.use_primer_nombre, createdBy.use_primer_apellido]
            .filter(Boolean)
            .join(' ') || createdBy.use_correo
        : null,
    };
  }
}
