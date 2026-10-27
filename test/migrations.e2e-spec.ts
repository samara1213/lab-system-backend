import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/database.config';
import { Baseline1792881301954 } from '../src/database/migrations/1792881301954-Baseline';
import { Fase3PermisosPorModulo1793059142392 } from '../src/database/migrations/1793059142392-Fase3PermisosPorModulo';
import { recreateTestDatabase } from './utils/test-database';

/**
 * Migracion de datos de la Fase 3 sobre una base con el esquema anterior y datos
 * con la forma de produccion (roles con opciones de menu en roles_menus)
 */
describe('Migración Fase 3: permisos por módulo a partir de roles_menus', () => {
  const s = `"${process.env.DB_SCHEMA}"`;
  let ds: DataSource;
  const q = (sql: string, params?: unknown[]) => ds.query(sql, params);

  // permisos de un rol como { modulo: 'vcud' }
  const permissionsOf = async (rol: string) => {
    const rows = await q(
      `SELECT p."moduleModSlug" AS mod, p.rpe_can_view AS v, p.rpe_can_create AS c, p.rpe_can_update AS u, p.rpe_can_delete AS d
      FROM ${s}.role_permissions p JOIN ${s}.roles r ON r.rol_id = p."roleRolId" WHERE r.rol_nombre = $1`,
      [rol],
    );
    return Object.fromEntries(
      rows.map((r: any) => [
        r.mod,
        ['v', 'c', 'u', 'd'].filter((k) => r[k]).join(''),
      ]),
    );
  };

  beforeAll(async () => {
    await recreateTestDatabase();
    ds = new DataSource({
      ...buildDataSourceOptions(),
      migrations: [Baseline1792881301954],
    });
    await ds.initialize();
    await ds.runMigrations();

    // datos como en produccion antes de la Fase 3
    await q(`INSERT INTO ${s}.laboratories (lab_id, lab_nit, lab_name, lab_address, lab_phone, lab_status, lab_email, lab_legal_representative)
      VALUES ('11111111-1111-4111-8111-111111111111', '1', 'Lab', 'Dir', '1', 'ACTIVO', 'lab@ejemplo.test', 'Rep')`);
    const menus = [
      [
        'a0000000-0000-4000-8000-000000000001',
        'Inicio',
        '/Dashboard/',
        1,
        null,
      ],
      ['a0000000-0000-4000-8000-000000000002', 'Órdenes', null, 1, null],
      [
        'a0000000-0000-4000-8000-000000000003',
        'Crear orden',
        '/orders/create',
        2,
        'a0000000-0000-4000-8000-000000000002',
      ],
      [
        'a0000000-0000-4000-8000-000000000004',
        'Pacientes',
        '/customers/create',
        1,
        null,
      ],
      ['a0000000-0000-4000-8000-000000000005', 'Exámenes', '/exams', 1, null],
      ['a0000000-0000-4000-8000-000000000006', 'Menús', '/menus', 1, null],
      [
        'a0000000-0000-4000-8000-000000000007',
        'Reportes',
        '/reportes',
        1,
        null,
      ],
    ];
    for (const [id, name, url, level, parent] of menus) {
      await q(
        `INSERT INTO ${s}.menus (men_id, men_name, men_url, men_level, "menParentMenId") VALUES ($1, $2, $3, $4, $5)`,
        [id, name, url, level, parent],
      );
    }
    const roles: [string, string, number[]][] = [
      ['b0000000-0000-4000-8000-000000000001', 'ADMIN', [1, 2, 3, 4, 5, 6, 7]],
      ['b0000000-0000-4000-8000-000000000002', 'RECEPCION', [1, 2, 3, 4]],
      ['b0000000-0000-4000-8000-000000000003', 'AUXILIAR', [5]],
    ];
    for (const [id, name, menuIdx] of roles) {
      await q(`INSERT INTO ${s}.roles (rol_id, rol_nombre) VALUES ($1, $2)`, [
        id,
        name,
      ]);
      for (const i of menuIdx)
        await q(
          `INSERT INTO ${s}.roles_menus ("rolesRolId", "menusMenId") VALUES ($1, $2)`,
          [id, menus[i - 1][0]],
        );
    }
    await q(
      `INSERT INTO ${s}.usuarios (use_correo, use_rol, "laboratoryLabId", "roleRolId") VALUES ('u@ejemplo.test', 'admin', '11111111-1111-4111-8111-111111111111', 'b0000000-0000-4000-8000-000000000002')`,
    );

    // se aplica la Fase 3
    await ds.destroy();
    ds = new DataSource({
      ...buildDataSourceOptions(),
      migrations: [Baseline1792881301954, Fase3PermisosPorModulo1793059142392],
    });
    await ds.initialize();
    await ds.runMigrations();
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  it('asocia cada menú a su módulo según la url (sin distinguir mayúsculas ni barras)', async () => {
    const rows = await q(
      `SELECT men_name, "moduleModSlug" AS mod FROM ${s}.menus ORDER BY men_name`,
    );
    expect(
      Object.fromEntries(rows.map((r: any) => [r.men_name, r.mod])),
    ).toEqual({
      'Crear orden': 'orders',
      Exámenes: 'exams',
      Inicio: 'orders',
      Menús: 'menus',
      Órdenes: null,
      Pacientes: 'customers',
      Reportes: null,
    });
  });

  it('conserva el orden en que se mostraban los menús', async () => {
    const rows = await q(
      `SELECT men_name FROM ${s}.menus WHERE men_level = 1 ORDER BY men_order`,
    );
    expect(rows.map((r: any) => r.men_name)).toEqual([
      'Inicio',
      'Órdenes',
      'Pacientes',
      'Exámenes',
      'Menús',
      'Reportes',
    ]);
  });

  it('el rol que administraba menús pasa a ser del sistema con todos los permisos', async () => {
    const [admin] = await q(
      `SELECT rol_is_system FROM ${s}.roles WHERE rol_nombre = 'ADMIN'`,
    );
    expect(admin.rol_is_system).toBe(true);
    expect(await permissionsOf('ADMIN')).toMatchObject({
      orders: 'vcud',
      results: 'vcu',
      menus: 'vcud',
      laboratories: 'vcu',
    });
  });

  it('los demás roles reciben todas las acciones de los módulos que veían, y resultados si veían órdenes', async () => {
    expect(await permissionsOf('RECEPCION')).toEqual({
      orders: 'vcud',
      results: 'vcu',
      customers: 'vcu',
    });
    expect(await permissionsOf('AUXILIAR')).toEqual({ exams: 'vcu' });
  });

  it('siembra los roles base sin duplicar uno existente (sin distinguir mayúsculas ni tildes)', async () => {
    const rows = await q(`SELECT rol_nombre FROM ${s}.roles`);
    expect(rows.map((r: any) => r.rol_nombre).sort()).toEqual([
      'ADMIN',
      'AUXILIAR',
      'Administrador de laboratorio',
      'Bacteriólogo',
      'RECEPCION',
      'Super administrador',
    ]);
  });

  it('el usuario conserva su rol y se elimina use_rol', async () => {
    const [user] = await q(`SELECT * FROM ${s}.usuarios`);
    expect(user.roleRolId).toBe('b0000000-0000-4000-8000-000000000002');
    expect(user).not.toHaveProperty('use_rol');
  });

  it('el revert deja el esquema anterior con roles_menus intacta', async () => {
    await ds.undoLastMigration();
    const roles = await q(`SELECT rol_nombre FROM ${s}.roles`);
    expect(roles.map((r: any) => r.rol_nombre).sort()).toEqual([
      'ADMIN',
      'AUXILIAR',
      'RECEPCION',
    ]);
    const [{ count }] = await q(
      `SELECT count(*)::int AS count FROM ${s}.roles_menus`,
    );
    expect(count).toBe(12);
    await expect(
      q(`INSERT INTO ${s}.roles (rol_nombre) VALUES ('ADMIN')`),
    ).rejects.toThrow(/duplicate key/);
  });
});
