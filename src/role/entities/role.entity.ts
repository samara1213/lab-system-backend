import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Menu } from '../../menu/entities/menu.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('uuid')
    rol_id: string;

    @Column('text', { unique: true })
    rol_nombre: string;

    @ManyToMany(() => Menu, (menu) => menu.roles)
    @JoinTable({ name: 'roles_menus' })
    menus: Menu[];
}
