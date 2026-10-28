import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';

/**
 * Clasificación de exámenes (sección del PDF de resultados: Hematología, Química...).
 * Sin laboratorio = clasificación del sistema (la ven todos); con laboratorio = solo ese laboratorio
 */
@Entity('exam_classifications')
export class ExamClassification {
  @PrimaryGeneratedColumn('uuid')
  cla_id: string;

  @Column('text')
  cla_name: string;

  // posición de la sección en el PDF (menor primero)
  @Column('int', { default: 0 })
  cla_order: number;

  // la sección muestra las imágenes adjuntas a la orden (por ejemplo, hemograma)
  @Column('bool', { default: false })
  cla_show_images: boolean;

  @Column('bool', { default: true })
  cla_active: boolean;

  @ManyToOne(() => Laboratory, { nullable: true, onDelete: 'CASCADE' })
  @Index()
  laboratory: Laboratory | null;

  @CreateDateColumn({ type: 'timestamp' })
  cla_created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  cla_updated_at: Date;
}
