import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Alliance } from '../../alliance/entities/alliance.entity';
import { Exam } from '../../exams/entities/exam.entity';


@Entity('laboratories')
export class Laboratory {
    
    @PrimaryGeneratedColumn('uuid')
    lab_id: string;

    @Column('text', { unique: true })
    lab_nit: string;

    @Column('text', { nullable: true })
    lab_dv: string;

    @Column('text')
    lab_name: string;

    @Column('text')
    lab_address: string;

    @Column('text')
    lab_phone: string;

    @Column('text')
    lab_status: string;

    @Column('text', { nullable: true })
    lab_logo: string;

    @Column('text', { unique: true })
    lab_email: string;

    @Column('text')
    lab_legal_representative: string;

    @CreateDateColumn({ type: 'timestamp' })
    lab_created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    lab_updated_at: Date;

    @OneToMany(() => User, (user) => user.laboratory)
    users: User[];

    @OneToMany(() => Alliance, (alliance) => alliance.laboratory)
    alliances: Alliance[];

    @OneToMany(() => Exam, (exam) => exam.laboratory)
    exams: Exam[];
}
