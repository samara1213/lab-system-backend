import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../role/entities/role.entity';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn('uuid')
  use_id: string;

  @Column('text', {
    nullable: true,
  })
  use_primer_nombre: string;

  @Column('text', {
    nullable: true,
  })
  use_primer_apellido: string;

  @Index({ unique: true })
  @Column('text')
  use_correo: string;

  @Column('text', {
    nullable: true,
    select: false,
  })
  use_contrasena: string;

  @Column('bool', {
    default: true,
  })
  use_primer_ingreso: boolean;

  @CreateDateColumn({
    type: 'timestamp',
  })
  use_fecha_creacion: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  use_fecha_modificacion: Date;

  @Column('text', { nullable: true })
  use_documento: string;

  @Column('text', { nullable: true })
  use_telefono: string;

  @Column('timestamp', { nullable: true })
  use_ultimo_ingreso: Date;

  // firma del profesional (ruta en Storage: <lab_id>/firmas/<uuid>.<ext>); va en el PDF de cada examen que firme
  @Column('text', { nullable: true })
  use_firma_path: string;

  // por ejemplo "Bacterióloga"
  @Column('text', { nullable: true })
  use_cargo: string;

  @Column('text', { nullable: true })
  use_registro_profesional: string;

  @Column('text', {
    nullable: true,
    default: 'ACTIVO',
  })
  use_estado: string;

  @ManyToOne(() => Laboratory, (laboratory) => laboratory.users)
  laboratory: Laboratory;

  // Relación: un usuario solo puede tener un rol
  @ManyToOne(() => Role, (role) => role.users)
  role: Role;
}
