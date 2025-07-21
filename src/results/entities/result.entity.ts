import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { ParamsExam } from '../../params_exams/entities/params_exam.entity';

@Entity('results')
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
}
