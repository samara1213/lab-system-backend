import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';

@Entity('alliances')
export class Alliance {
  @PrimaryGeneratedColumn('uuid')
  ali_id: string;

  @Column('text')
  ali_nombre: string;

  @Column('text')
  ali_direccion: string;

  @Column('text')
  ali_telefono: string;

  @Column('text')
  ali_nombre_contacto: string;

  @ManyToOne(() => Laboratory, (laboratory) => laboratory.alliances)
  laboratory: Laboratory;

  @CreateDateColumn({ type: 'timestamp' })
  ali_fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  ali_fecha_actualizacion: Date;
}
