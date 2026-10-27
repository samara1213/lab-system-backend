import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Catalogo de modulos sobre los que se asignan permisos (ordenes, resultados,
 * pacientes...). Lo siembran las migraciones; el codigo los referencia por slug
 */
@Entity('modules')
export class PermissionModule {
  @PrimaryColumn('text')
  mod_slug: string;

  @Column('text')
  mod_name: string;

  @Column('text', { nullable: true })
  mod_description: string;

  @Column('int', { default: 0 })
  mod_order: number;

  // solo los roles del sistema (super administrador) pueden tener permisos en un modulo global
  @Column('bool', { default: false })
  mod_global: boolean;

  // acciones que aplican al modulo (por ejemplo, resultados no tiene "delete")
  @Column('text', {
    array: true,
    default: () => `'{view,create,update,delete}'`,
  })
  mod_actions: string[];
}
