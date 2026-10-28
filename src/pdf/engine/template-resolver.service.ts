import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PdfTemplate } from '../entities/pdf_template.entity';
import { compileTemplate } from './template-engine';
import { describeError } from '../../exceptions/exception/safe-error.helper';

export type CompiledTemplate = ReturnType<typeof compileTemplate>;

// plantillas compiladas que se guardan en memoria (por id + sha256)
const MAX_CACHED = 50;

export const sha256 = (content: string) =>
  createHash('sha256').update(content, 'utf8').digest('hex');

/**
 * Elige y compila la plantilla de cada laboratorio:
 * activa del laboratorio → activa del sistema → plantilla base incluida en el backend.
 * Las compiladas quedan en caché por id + sha256 (una plantilla nueva tiene otro id).
 */
@Injectable()
export class TemplateResolverService {
  private readonly logger = new Logger('PdfTemplates');
  private readonly cache = new Map<string, CompiledTemplate>();
  private defaultSource: string | null = null;
  private defaultCompiled: CompiledTemplate | null = null;

  constructor(
    @InjectRepository(PdfTemplate)
    private readonly templateRepository: Repository<PdfTemplate>,
  ) {}

  /**
   * Plantilla con la que se imprime el PDF de un laboratorio
   * @param lab_id id del laboratorio
   */
  async forLaboratory(lab_id: string): Promise<CompiledTemplate> {
    const active = await this.templateRepository.find({
      where: [
        { tpl_active: true, laboratory: { lab_id } },
        { tpl_active: true, laboratory: IsNull() },
      ],
      relations: { laboratory: true },
      select: {
        tpl_id: true,
        tpl_sha256: true,
        laboratory: { lab_id: true },
      },
    });
    const chosen = active.find((tpl) => tpl.laboratory) ?? active[0];
    if (!chosen) return this.getDefault();

    return (
      (await this.byId(chosen.tpl_id, chosen.tpl_sha256)) ?? this.getDefault()
    );
  }

  /**
   * Plantilla guardada, compilada (o null si su contenido no coincide con su sha256
   * o no compila: se registra y se usa la plantilla base)
   * @param tpl_id id de la plantilla
   * @param expectedSha sha256 registrado
   */
  async byId(
    tpl_id: string,
    expectedSha: string,
  ): Promise<CompiledTemplate | null> {
    const key = `${tpl_id}:${expectedSha}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const template = await this.templateRepository.findOne({
      where: { tpl_id },
      select: { tpl_id: true, tpl_content: true },
    });
    if (!template) return null;
    if (sha256(template.tpl_content) !== expectedSha) {
      this.logger.error(
        `La plantilla ${tpl_id} no coincide con su sha256: se usa la plantilla base`,
      );
      return null;
    }
    try {
      const compiled = compileTemplate(template.tpl_content);
      if (this.cache.size >= MAX_CACHED)
        this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, compiled);
      return compiled;
    } catch (error) {
      this.logger.error(
        `La plantilla ${tpl_id} no compila (${describeError(error)}): se usa la plantilla base`,
      );
      return null;
    }
  }

  /**
   * Plantilla base incluida en el backend (src/pdf/templates/resultados.html)
   */
  getDefault(): CompiledTemplate {
    if (!this.defaultCompiled)
      this.defaultCompiled = compileTemplate(this.getDefaultSource());
    return this.defaultCompiled;
  }

  /**
   * HTML de la plantilla base (punto de partida para una plantilla propia)
   */
  getDefaultSource(): string {
    if (this.defaultSource === null) {
      // en producción se copia a dist (yarn build); en desarrollo se lee de src
      const path = __dirname.includes('dist')
        ? resolve(__dirname, '../templates/resultados.html')
        : resolve(process.cwd(), 'src/pdf/templates/resultados.html');
      this.defaultSource = readFileSync(path, 'utf8');
    }
    return this.defaultSource;
  }
}
