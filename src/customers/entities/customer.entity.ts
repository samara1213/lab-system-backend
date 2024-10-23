import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity('customers')
@Unique(['cus_tipo_doc', 'cus_companie']) // Clave única compuesta
export class Customer {

    @PrimaryGeneratedColumn('uuid')
    cus_id: string;

    @Column('text',{
        nullable: false
    })
    cus_tipo_doc: string;

    @Column('text',{
        nullable: false   
    })
    cus_numero_doc:  string;

    @Column('text',{
        nullable: false
    })
    cus_primer_apellido: string;

    @Column('text')
    cus_segundo_apellido: string;

    @Column('text',{
        nullable: false
    })
    cus_primer_nombre: string;

    @Column('text')
    cus_segundo_nombre: string;

    @Column('text')
    cus_direccion: string;

    @Column('text',{
        nullable: false
    })
    cus_genero:  string;

    @Column('date')
    cus_fecha_nacimiento: Date;

    @Column('text',{
        nullable: false
    })
    cus_telefono: string;

    @Column('text',{
        nullable: false
    })
    cus_correo: string;

    @Column('text',{
        nullable: false
    })
    @Index()
    cus_companie: string

    @CreateDateColumn({
        type: 'timestamp'
    })
    cus_fecha_creacion: Date;

    @Column('text')
    cus_usuario_creacion: string;

    @UpdateDateColumn({
        type: 'timestamp'
    })
    cus_fecha_modificacion: Date;

    @Column('text',{
        nullable: true
    })
    cus_usuario_modificacion: string;
}
