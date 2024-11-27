import { Exam } from 'src/exams/entities/exam.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('params_exams')
export class ParamsExam {

    @PrimaryGeneratedColumn('uuid')
    pae_id: string;

    @Column('text',{
        nullable: false
    })
    pae_name: string;

    @Column('text',{
        nullable: false
    })
    pae_default_value: string;

    @Column('bool',{
        default: false
    })
    pae_range: boolean;

    @Column('text',{
        nullable: false
    })
    pae_unit_extent: string;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_min_mam: number;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_max_mam: number;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_min_woman: number;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_max_womam: number;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_min_child: number;

    @Column('decimal',{
        scale: 3,
        nullable: true

    })
    pae_max_child: number;

    @CreateDateColumn({
        type: 'timestamp'
    })
    pae_creation_date: Date;

    @Column('text')
    pae_user_creation: string;

    @UpdateDateColumn({
        type: 'timestamp'
    })
    pae_modification_date: Date;

    @Column('text',{
        nullable: true        
    })
    pae_user_modification: string;

    @Column('text',{   
        default: 'ACTIVO'        
    })
    pae_state: string;

    @ManyToOne(
        () => Exam,
        (exam) => exam.parm_exam,
        {eager: false}        
    )    
    exam: Exam;


}
