import { Column, CreateDateColumn, Entity, Index, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { Alliance } from '../../alliance/entities/alliance.entity';
import { ParamsExam } from '../../params_exams/entities/params_exam.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('exams')
export class Exam {

  @PrimaryGeneratedColumn('uuid')
  exa_id: string;

  @Column('text')
  exa_name: string;

  @Column('text', { nullable: true })
  exa_description: string;


  @Column('decimal', { precision: 10, scale: 2 })
  exa_price: number;

  @Column('text', { nullable: true })
  exa_classification: string;

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
