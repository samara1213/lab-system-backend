import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany } from 'typeorm';
import { Role } from '../../role/entities/role.entity';

@Entity('menus')
export class Menu {
    @PrimaryGeneratedColumn('uuid')
    men_id: string;

    @Column('text')
    men_name: string;

    @Column('int', { nullable: true })
    men_level: number;

    @ManyToOne(() => Menu, (menu) => menu.children, { nullable: true, onDelete: 'CASCADE' })
    men_parent: Menu;

    @OneToMany(() => Menu, (menu) => menu.men_parent)
    children: Menu[];

    @ManyToMany(() => Role, (role) => role.menus)
    roles: Role[];

    @Column('text', { nullable: true })
    men_url: string;

    @Column('text', { nullable: true })
    men_icon: string;
}
