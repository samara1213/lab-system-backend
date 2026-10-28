import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { Alliance } from '../../alliance/entities/alliance.entity';
import { ParamsExam } from '../../params_exams/entities/params_exam.entity';
import { Order } from '../../orders/entities/order.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { ExamClassification } from '../../exam_classifications/entities/exam_classification.entity';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  exa_id: string;

  @Column('text')
  exa_name: string;

  @Column('text', { nullable: true })
  exa_description: string;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  exa_price: number;

  // código numérico anterior a la Fase 5 ("1" a "8"); se reemplaza por "classification" y se quita en la Fase 7
  @Column('text', { nullable: true })
  exa_classification: string;

  // sección del PDF donde va el examen (sin clasificación: "Otros exámenes", al final)
  @ManyToOne(() => ExamClassification, { nullable: true, onDelete: 'SET NULL' })
  @Index()
  classification: ExamClassification | null;

  @CreateDateColumn({ type: 'timestamp' })
  exa_created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  exa_updated: Date;

  @ManyToOne(() => Laboratory, (laboratory) => laboratory.exams)
  @Index()
  laboratory: Laboratory;

  @ManyToOne(() => Alliance, { nullable: true })
  alliance: Alliance;

  @OneToMany(() => ParamsExam, (paramExam) => paramExam.exam)
  parameters: ParamsExam[];

  @ManyToMany(() => Order, (order) => order.exams)
  orders: Order[];
}
