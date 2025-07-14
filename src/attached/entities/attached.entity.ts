import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('attached')
export class Attached {
  @PrimaryGeneratedColumn('uuid', { name: 'att_id' })
  att_id: string;

  @Column('text', { name: 'att_file_url' })
  att_file_url: string;

  @CreateDateColumn({ type: 'timestamp', name: 'att_created_at' })
  att_created_at: Date;

  @ManyToOne(() => Order, order => order.attachedFiles, { nullable: false })
  order: Order;
}
