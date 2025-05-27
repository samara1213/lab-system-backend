import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

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
}
