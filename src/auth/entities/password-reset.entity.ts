import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Solicitud de recuperacion de contraseña. Solo se guarda el hash (sha256) del
 * token enviado por correo; vence a los 30 minutos y se usa una sola vez
 */
@Entity('password_resets')
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  pre_id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @Column('text', { unique: true })
  pre_token_hash: string;

  @Column('timestamp')
  pre_expires_at: Date;

  @Column('timestamp', { nullable: true })
  pre_used_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  pre_created_at: Date;
}
