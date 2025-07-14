import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Generated, ManyToOne, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { Result } from '../../results/entities/result.entity';
import { Attached } from '../../attached/entities/attached.entity';

@Entity('orders')
export class Order {
    
  @PrimaryGeneratedColumn('uuid')
  ord_id: string;

  @Column({ unique: true, type: 'int' })
  @Generated('increment')
  ord_code: number;

  @CreateDateColumn({ type: 'timestamp' })
  ord_created_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  ord_updated_at: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  ord_total_value: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  ord_discount_percentage?: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  ord_discount_value?: number;

  @Column('text', { default: 'PENDIENTE' })
  ord_status: string;

  @ManyToOne(() => Laboratory, (laboratory) => laboratory.orders, { nullable: false })
  laboratory: Laboratory;

  @ManyToOne(() => Customer, (customer) => customer.orders, { nullable: false })
  customer: Customer;

  @ManyToMany(() => Exam)
  @JoinTable({
    name: 'orders_exams',
    joinColumn: { name: 'ord_id', referencedColumnName: 'ord_id' },
    inverseJoinColumn: { name: 'exa_id', referencedColumnName: 'exa_id' }
  })
  exams: Exam[];

  @OneToMany(() => Result, (result) => result.order)
  results: Result[];

  @Column('text', { nullable: true })
  ord_pdf_url: string;

  @OneToMany(() => Attached, attached => attached.order)
  attachedFiles: Attached[];
}
