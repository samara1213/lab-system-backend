import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Laboratory } from '../../laboratory/entities/laboratory.entity';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Rol de usuario. Sin laboratorio es un rol global (lo pueden asignar todos los
 * laboratorios); con laboratorio, solo existe en ese laboratorio.
 * Los roles del sistema (super administrador) tienen todos los permisos
 */
@Entity('roles')
// el nombre no se repite entre los roles globales ni dentro de un mismo laboratorio
@Index('UQ_roles_nombre_global', ['rol_nombre'], {
  unique: true,
  where: '"laboratoryLabId" IS NULL',
})
@Index('UQ_roles_nombre_laboratorio', ['rol_nombre', 'laboratory'], {
  unique: true,
  where: '"laboratoryLabId" IS NOT NULL',
})
export class Role {
  @PrimaryGeneratedColumn('uuid')
  rol_id: string;

  @Column('text')
  rol_nombre: string;

  @Column('text', { nullable: true })
  rol_description: string;

  // rol del sistema: todos los permisos, incluidos los modulos globales; no se edita desde la aplicacion
  @Column('bool', { default: false })
  rol_is_system: boolean;

  @Column('bool', { default: true })
  rol_active: boolean;

  @ManyToOne(() => Laboratory, { nullable: true })
  laboratory: Laboratory;

  @OneToMany(() => RolePermission, (permission) => permission.role)
  permissions: RolePermission[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
