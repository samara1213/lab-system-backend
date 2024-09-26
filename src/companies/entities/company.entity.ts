import { User } from "src/auth/entities/user.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('companies')
export class Company {

    @PrimaryGeneratedColumn('uuid')
    com_id: string;

    @Column('text',{
        unique: true
    })
    com_nit: string;

    @Column('text',{
        nullable: true
    })
    com_dv: string;

    @Column('text')
    com_nombre: string;

    @Column('text')
    com_direccion: string;

    @Column('text')
    com_telefono: string;

    @Column('text')
    com_correo: string;

    @Column('text',{
        nullable: true
    })
    com_logo: string;

    @Column('text')
    com_estado: string;

    @Column('text')
    com_representante_legal: string;

    @CreateDateColumn({
        type: 'timestamp'
    })
    com_fecha_creacion: Date;

    @Column('text')
    com_usuario_creacion: string;

    @UpdateDateColumn({
        type: 'timestamp'
    })
    com_fecha_modificacion: Date;

    @Column('text',{
        nullable: true
    })
    com_usuario_modificacion: string;

    @OneToMany(
        () => User,
        (user) =>  user.company
    )
    user: User;
}
