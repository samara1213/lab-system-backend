import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { PermissionModule } from '../../permissions/entities/permission-module.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  men_id: string;

  @Column('text')
  men_name: string;

  @Column('int', { nullable: true })
  men_level: number;

  @ManyToOne(() => Menu, (menu) => menu.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  men_parent: Menu;

  @OneToMany(() => Menu, (menu) => menu.men_parent)
  children: Menu[];

  @Column('text', { nullable: true })
  men_url: string;

  @Column('text', { nullable: true })
  men_icon: string;

  // posicion entre sus hermanos (menor primero)
  @Column('int', { default: 0 })
  men_order: number;

  @Column('bool', { default: true })
  men_active: boolean;

  // la opcion se muestra a los roles que pueden ver este modulo (los grupos no tienen modulo)
  @ManyToOne(() => PermissionModule, { nullable: true, onDelete: 'SET NULL' })
  module: PermissionModule;
}
