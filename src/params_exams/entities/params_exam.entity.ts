import { Exam } from '../../exams/entities/exam.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('exams_parameters')
export class ParamsExam {

    @PrimaryGeneratedColumn('uuid')
    par_id: string;

    @Column('text', {
        nullable: false
    })
    par_name: string;

    @Column('text', {
        nullable: false
    })
    par_default_value: string;

    @Column('bool', {
        default: false
    })
    par_range: boolean;

    @Column('text', {
        nullable: true
    })
    par_unit_extent: string;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_min_man: number;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_max_man: number;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_min_woman: number;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_max_woman: number;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_min_child: number;

    @Column('decimal', {
        scale: 3,
        nullable: true

    })
    par_max_child: number;

    @Column('text', { nullable: true })
    par_reference_value: string;

    @CreateDateColumn({
        type: 'timestamp'
    })
    par_creation_date: Date;
    
    @UpdateDateColumn({
        type: 'timestamp'
    })
    par_modification_date: Date;

    @Column('text', {   
        default: 'ACTIVO'        
    })
    par_state: string;

    @ManyToOne(() => Exam, { nullable: false })
    exam: Exam;
}
