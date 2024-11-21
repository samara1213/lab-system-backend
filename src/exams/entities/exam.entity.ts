import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('exams')
export class Exam {

    @PrimaryGeneratedColumn('uuid')
    exa_id: string;

    @Column('text',{
        nullable: false
    })
    exa_name: string;

    @Column('text',{
        nullable: false
    })
    exa_description: string;

    @Column('decimal',{
        scale: 3
    })
    exa_value: number;

    @Column('text',{
        nullable: false
    })
    @Index()
    exa_companie: string

    @CreateDateColumn({
        type: 'timestamp'
    })
    exa_creation_date: Date;

    @Column('text')
    exa_user_creation: string;

    @UpdateDateColumn({
        type: 'timestamp'
    })
    exa_modification_date: Date;

    @Column('text',{
        nullable: true
    })
    exa_user_modification: string;
}
