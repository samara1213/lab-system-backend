import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { PermissionModule } from './permission-module.entity';

/**
 * Permisos de un rol sobre un modulo: ver, crear, editar y eliminar
 */
@Entity('role_permissions')
@Unique('UQ_role_permissions_role_module', ['role', 'module'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  rpe_id: string;

  @ManyToOne(() => Role, (role) => role.permissions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  role: Role;

  @ManyToOne(() => PermissionModule, { nullable: false, onDelete: 'CASCADE' })
  module: PermissionModule;

  @Column('bool', { default: false })
  rpe_can_view: boolean;

  @Column('bool', { default: false })
  rpe_can_create: boolean;

  @Column('bool', { default: false })
  rpe_can_update: boolean;

  @Column('bool', { default: false })
  rpe_can_delete: boolean;
}
