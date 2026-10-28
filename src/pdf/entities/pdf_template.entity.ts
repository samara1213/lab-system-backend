import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Plantilla Handlebars del PDF de resultados. Sin laboratorio = plantilla del sistema
 * (la usan los laboratorios sin plantilla propia). Solo una activa por laboratorio y una
 * del sistema. El contenido no cambia: para modificarla se sube una nueva y se activa
 */
@Entity('pdf_templates')
@Index('UQ_pdf_templates_active_lab', ['laboratory'], {
  unique: true,
  where: '"tpl_active" AND "laboratoryLabId" IS NOT NULL',
})
@Index('UQ_pdf_templates_active_system', ['tpl_active'], {
  unique: true,
  where: '"tpl_active" AND "laboratoryLabId" IS NULL',
})
export class PdfTemplate {
  @PrimaryGeneratedColumn('uuid')
  tpl_id: string;

  @Column('text')
  tpl_name: string;

  @Column('text', { nullable: true })
  tpl_description: string | null;

  // HTML de la plantilla (máximo 256 KB); no se carga en los listados
  @Column('text', { select: false })
  tpl_content: string;

  // sha256 del contenido: identifica la versión en la caché de plantillas compiladas
  @Column('text')
  tpl_sha256: string;

  @Column('int')
  tpl_size: number;

  @Column('bool', { default: false })
  tpl_active: boolean;

  @ManyToOne(() => Laboratory, { nullable: true, onDelete: 'CASCADE' })
  laboratory: Laboratory | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tpl_created_by' })
  createdBy: User | null;

  @CreateDateColumn({ type: 'timestamp' })
  tpl_created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  tpl_updated_at: Date;
}
