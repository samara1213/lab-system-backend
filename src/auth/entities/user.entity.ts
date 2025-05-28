import { Laboratory } from "src/laboratory/entities/laboratory.entity";
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Role } from "src/role/entities/role.entity";

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
        () => Laboratory,
        (laboratory) => laboratory.users
    )
    laboratory: Laboratory;

    // Relación: un usuario solo puede tener un rol
    @ManyToOne(() => Role)
    role: Role;
}
