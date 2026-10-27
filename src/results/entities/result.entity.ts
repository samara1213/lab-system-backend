import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { ParamsExam } from '../../params_exams/entities/params_exam.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('results')
// el guardado en lote busca los resultados de una orden por parámetro
@Index('IDX_results_order_param', ['order', 'param'])
export class Result {
  @PrimaryGeneratedColumn('uuid')
  res_id: string;

  @Column('text')
  res_value: string;

  @Column('text', { nullable: true })
  res_observation: string;

  @Column('text', { nullable: true })
  res_reference: string;

  @CreateDateColumn({ type: 'timestamp' })
  res_created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  res_updated_at: Date;

  @ManyToOne(() => Order, (order) => order.results, { nullable: false })
  order: Order;

  @ManyToOne(() => Exam, { nullable: false })
  exam: Exam;

  @ManyToOne(() => ParamsExam, { nullable: false })
  param: ParamsExam;

  // quién registró el resultado (vacío en los resultados anteriores a la Fase 4)
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'res_registered_by' })
  registeredBy: User;

  // quién lo modificó por última vez: es quien firma el examen en el PDF
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'res_updated_by' })
  updatedBy: User;
}
