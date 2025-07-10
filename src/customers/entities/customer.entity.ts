import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('customers')
@Unique(['cus_document_number', 'laboratory'])
export class Customer {

    @PrimaryGeneratedColumn('uuid')
    cus_id: string;

    @Column('text', { nullable: false })
    cus_document_type: string;

    @Column('text', { nullable: false })
    cus_document_number: string;

    @Column('text', { nullable: false })
    cus_first_lastname: string;

    @Column('text')
    cus_second_lastname: string;

    @Column('text', { nullable: false })
    cus_first_name: string;

    @Column('text')
    cus_second_name: string;

    @Column('text')
    cus_address: string;

    @Column('text', { nullable: false })
    cus_gender: string;

    @Column('date')
    cus_birthdate: Date;

    @Column('text', { nullable: false })
    cus_phone: string;

    @Column('text', { nullable: false })
    cus_email: string;

    @CreateDateColumn({ type: 'timestamp' })
    cus_created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    cus_updated_at: Date;

    @ManyToOne(() => Laboratory, (laboratory) => laboratory.customers, { nullable: false })
    @Index()
    laboratory: Laboratory;

    @OneToMany(() => Order, (order) => order.customer)
    orders: Order[];
}
