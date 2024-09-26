import { Company } from "src/companies/entities/company.entity";
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('usuarios')
export class User {

    @PrimaryGeneratedColumn('uuid')    
    use_id: string;

    @Column('text',{
        nullable: true
    })
    use_primer_nombre: string;

    @Column('text',{
        nullable: true
    })
    use_primer_apellido: string;

    @Index({unique: true})
    @Column('text')
    use_correo: string;

    @Column('text',{
        nullable: true,
        select: false
    })
    use_contrasena: string;

    @Column('bool',{
        default: true
    })
    use_primer_ingreso: boolean;

    @CreateDateColumn({
        type: 'timestamp'
    })
    use_fecha_creacion: Date;

    @UpdateDateColumn({
        type: 'timestamp'
    })
    use_fecha_modificacion: Date;


    @Column('text',{
        nullable: true,
        default: 'admin',
    })
    use_rol: string;

    @Column('text',{
        nullable: true,
        default: 'ACTIVO'
    })
    use_estado: string;

    @ManyToOne(
        () => Company,
        (company) => company.user,
        {eager:  true}
    )
    company: Company;
}
