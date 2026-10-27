import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 3: permisos por modulo (ver, crear, editar, eliminar), roles globales y
 * por laboratorio, campos nuevos de usuario y recuperacion de contraseña.
 *
 * Datos (pensado para produccion):
 * - Cada menu queda asociado a un modulo segun su men_url.
 * - Los roles que hoy tienen las opciones Menus o Laboratorios pasan a ser roles del sistema.
 * - Cada rol recibe TODAS las acciones de los modulos que hoy ve en su menu (el
 *   mismo comportamiento de antes: tener la opcion de menu permitia todo).
 *   Quien ve ordenes tambien recibe resultados (la captura se abre desde el dashboard).
 * - Se siembran los roles base (solo si no existe uno con el mismo nombre).
 * - "roles_menus" se conserva sin uso para poder volver al backend anterior; se elimina en la Fase 7.
 */
export class Fase3PermisosPorModulo1793059142392 implements MigrationInterface {
  name = 'Fase3PermisosPorModulo1793059142392';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    // --- esquema ---
    await queryRunner.query(
      `CREATE TABLE ${s}."modules" ("mod_slug" text NOT NULL, "mod_name" text NOT NULL, "mod_description" text, "mod_order" integer NOT NULL DEFAULT '0', "mod_global" boolean NOT NULL DEFAULT false, "mod_actions" text array NOT NULL DEFAULT '{view,create,update,delete}', CONSTRAINT "PK_c9051353a5cede67803daa9a43d" PRIMARY KEY ("mod_slug"))`,
    );
    await queryRunner.query(
      `CREATE TABLE ${s}."role_permissions" ("rpe_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rpe_can_view" boolean NOT NULL DEFAULT false, "rpe_can_create" boolean NOT NULL DEFAULT false, "rpe_can_update" boolean NOT NULL DEFAULT false, "rpe_can_delete" boolean NOT NULL DEFAULT false, "roleRolId" uuid NOT NULL, "moduleModSlug" text NOT NULL, CONSTRAINT "UQ_role_permissions_role_module" UNIQUE ("roleRolId", "moduleModSlug"), CONSTRAINT "PK_ed291c4407e2eb8d0e2e8edba42" PRIMARY KEY ("rpe_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE ${s}."password_resets" ("pre_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pre_token_hash" text NOT NULL, "pre_expires_at" TIMESTAMP NOT NULL, "pre_used_at" TIMESTAMP, "pre_created_at" TIMESTAMP NOT NULL DEFAULT now(), "userUseId" uuid NOT NULL, CONSTRAINT "UQ_780727d9044e8ffe21151802b88" UNIQUE ("pre_token_hash"), CONSTRAINT "PK_4ec8a4908855051ccfdf57a706b" PRIMARY KEY ("pre_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_rol"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD "rol_description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD "rol_is_system" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD "rol_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD "laboratoryLabId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_documento" text`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_telefono" text`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_ultimo_ingreso" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" ADD "men_order" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" ADD "men_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" ADD "moduleModSlug" text`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP CONSTRAINT "UQ_96aaed1c729577ea6fe99348402"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_roles_nombre_laboratorio" ON ${s}."roles"  ("rol_nombre", "laboratoryLabId") WHERE "laboratoryLabId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_roles_nombre_global" ON ${s}."roles"  ("rol_nombre") WHERE "laboratoryLabId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."role_permissions" ADD CONSTRAINT "FK_60c3e30d44c0e55733e97bf9c59" FOREIGN KEY ("roleRolId") REFERENCES ${s}."roles"("rol_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."role_permissions" ADD CONSTRAINT "FK_2d2b5d31fe1f430250a029a8b16" FOREIGN KEY ("moduleModSlug") REFERENCES ${s}."modules"("mod_slug") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD CONSTRAINT "FK_349dcb30adc4e7bfac3b9f55710" FOREIGN KEY ("laboratoryLabId") REFERENCES ${s}."laboratories"("lab_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."password_resets" ADD CONSTRAINT "FK_43e57397d8e6efc74910287ef34" FOREIGN KEY ("userUseId") REFERENCES ${s}."usuarios"("use_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" ADD CONSTRAINT "FK_b4318775d3a8797857242c01d21" FOREIGN KEY ("moduleModSlug") REFERENCES ${s}."modules"("mod_slug") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // --- catalogo de modulos ---
    await queryRunner.query(`INSERT INTO ${s}."modules" ("mod_slug", "mod_name", "mod_description", "mod_order", "mod_global", "mod_actions") VALUES
            ('orders', 'Órdenes', 'Crear, buscar y cancelar órdenes; generar, ver y enviar el PDF; adjuntos', 1, false, '{view,create,update,delete}'),
            ('results', 'Resultados', 'Registrar y corregir los resultados de una orden', 2, false, '{view,create,update}'),
            ('customers', 'Pacientes', 'Registrar, buscar y editar pacientes', 3, false, '{view,create,update}'),
            ('exams', 'Exámenes y parámetros', 'Catálogo de exámenes, precios y rangos de referencia', 4, false, '{view,create,update}'),
            ('alliances', 'Convenios', 'Convenios con empresas o entidades', 5, false, '{view,create,update}'),
            ('users', 'Usuarios', 'Usuarios del laboratorio', 6, false, '{view,create,update}'),
            ('roles', 'Roles y permisos', 'Roles del laboratorio y sus permisos', 7, false, '{view,create,update,delete}'),
            ('menus', 'Menús', 'Opciones del menú (solo super administrador)', 8, true, '{view,create,update,delete}'),
            ('laboratories', 'Laboratorios', 'Laboratorios del sistema (solo super administrador)', 9, true, '{view,create,update}')`);

    // orden inicial entre hermanos: el fisico de las filas, que es como se mostraban hasta ahora
    // (antes de cualquier UPDATE sobre menus: un UPDATE mueve la fila y cambia su ctid)
    await queryRunner.query(`UPDATE ${s}."menus" m SET "men_order" = x.pos FROM (
            SELECT "men_id", row_number() OVER (PARTITION BY "menParentMenId" ORDER BY ctid) AS pos FROM ${s}."menus"
        ) x WHERE m."men_id" = x."men_id"`);

    // --- modulo de cada opcion de menu, segun su url ('/Orders/Create/' = 'orders/create') ---
    await queryRunner.query(`UPDATE ${s}."menus" m SET "moduleModSlug" = x.slug FROM (
            SELECT "men_id", CASE
                WHEN u = 'dashboard' OR u = 'orders' OR u LIKE 'orders/%' THEN 'orders'
                WHEN u = 'results' OR u LIKE 'results/%' THEN 'results'
                WHEN u = 'customers' OR u LIKE 'customers/%' THEN 'customers'
                WHEN u IN ('exams', 'param-exams') OR u LIKE 'exams/%' OR u LIKE 'param-exams/%' THEN 'exams'
                WHEN u = 'alliances' OR u LIKE 'alliances/%' THEN 'alliances'
                WHEN u = 'users' THEN 'users'
                WHEN u = 'roles' THEN 'roles'
                WHEN u = 'menus' THEN 'menus'
                WHEN u = 'laboratories' THEN 'laboratories'
            END AS slug
            FROM (SELECT "men_id", lower(trim(both '/' from trim("men_url"))) AS u FROM ${s}."menus" WHERE "men_url" IS NOT NULL) urls
        ) x WHERE m."men_id" = x."men_id" AND x.slug IS NOT NULL`);

    // --- roles del sistema: los que hoy administran menus o laboratorios ---
    await queryRunner.query(`UPDATE ${s}."roles" SET "rol_is_system" = true WHERE "rol_id" IN (
            SELECT rm."rolesRolId" FROM ${s}."roles_menus" rm
            JOIN ${s}."menus" m ON m."men_id" = rm."menusMenId"
            WHERE m."moduleModSlug" IN ('menus', 'laboratories'))`);

    // --- permisos: todas las acciones de cada modulo que el rol ve hoy ---
    await queryRunner.query(`INSERT INTO ${s}."role_permissions" ("roleRolId", "moduleModSlug", "rpe_can_view", "rpe_can_create", "rpe_can_update", "rpe_can_delete")
            SELECT DISTINCT r."rol_id", mo."mod_slug", true,
                'create' = ANY(mo."mod_actions"), 'update' = ANY(mo."mod_actions"), 'delete' = ANY(mo."mod_actions")
            FROM ${s}."roles" r
            JOIN ${s}."modules" mo ON (
                -- sistema: todos los modulos
                r."rol_is_system"
                -- demas roles: los modulos de sus opciones de menu, y resultados si ven ordenes
                OR mo."mod_slug" IN (
                    SELECT m."moduleModSlug" FROM ${s}."roles_menus" rm JOIN ${s}."menus" m ON m."men_id" = rm."menusMenId"
                    WHERE rm."rolesRolId" = r."rol_id" AND m."moduleModSlug" IS NOT NULL
                    UNION
                    SELECT 'results' FROM ${s}."roles_menus" rm JOIN ${s}."menus" m ON m."men_id" = rm."menusMenId"
                    WHERE rm."rolesRolId" = r."rol_id" AND m."moduleModSlug" = 'orders'
                )
            )
            WHERE r."rol_is_system" OR NOT mo."mod_global"`);

    // --- roles base (ids fijos para poder quitarlos en el down); se omiten si ya existe el nombre (sin distinguir mayúsculas ni tildes) ---
    for (const [id, name, description, isSystem] of BASE_ROLES) {
      await queryRunner.query(
        `INSERT INTO ${s}."roles" ("rol_id", "rol_nombre", "rol_description", "rol_is_system")
                 SELECT $1, $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM ${s}."roles" WHERE "laboratoryLabId" IS NULL
                     AND translate(lower("rol_nombre"), 'áéíóúü', 'aeiouu') = translate(lower($2), 'áéíóúü', 'aeiouu'))`,
        [id, name, description, isSystem],
      );
    }
    for (const [roleId, slug, view, create, update, del] of BASE_PERMISSIONS) {
      await queryRunner.query(
        `INSERT INTO ${s}."role_permissions" ("roleRolId", "moduleModSlug", "rpe_can_view", "rpe_can_create", "rpe_can_update", "rpe_can_delete")
                 SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM ${s}."roles" WHERE "rol_id" = $1)`,
        [roleId, slug, view, create, update, del],
      );
    }
    await queryRunner.query(
      `INSERT INTO ${s}."role_permissions" ("roleRolId", "moduleModSlug", "rpe_can_view", "rpe_can_create", "rpe_can_update", "rpe_can_delete")
            SELECT $1, "mod_slug", true, 'create' = ANY("mod_actions"), 'update' = ANY("mod_actions"), 'delete' = ANY("mod_actions")
            FROM ${s}."modules" WHERE EXISTS (SELECT 1 FROM ${s}."roles" WHERE "rol_id" = $1)`,
      [SUPER_ADMIN_ID],
    );
    await queryRunner.query(
      `INSERT INTO ${s}."role_permissions" ("roleRolId", "moduleModSlug", "rpe_can_view", "rpe_can_create", "rpe_can_update", "rpe_can_delete")
            SELECT $1, "mod_slug", true, 'create' = ANY("mod_actions"), 'update' = ANY("mod_actions"), 'delete' = ANY("mod_actions")
            FROM ${s}."modules" WHERE NOT "mod_global" AND EXISTS (SELECT 1 FROM ${s}."roles" WHERE "rol_id" = $1)`,
      [LAB_ADMIN_ID],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    // volver al nombre unico global exige que no haya roles por laboratorio ni nombres repetidos
    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM ${s}."roles" WHERE "laboratoryLabId" IS NOT NULL`,
    );
    if (count > 0)
      throw new Error(
        `Hay ${count} roles de laboratorio: reasignar sus usuarios y eliminarlos antes de revertir`,
      );

    // roles base sembrados por esta migracion, si nadie los usa
    await queryRunner.query(
      `DELETE FROM ${s}."roles" r WHERE r."rol_id" = ANY($1)
            AND NOT EXISTS (SELECT 1 FROM ${s}."usuarios" u WHERE u."roleRolId" = r."rol_id")`,
      [BASE_ROLES.map(([id]) => id)],
    );

    await queryRunner.query(
      `ALTER TABLE ${s}."menus" DROP CONSTRAINT "FK_b4318775d3a8797857242c01d21"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."password_resets" DROP CONSTRAINT "FK_43e57397d8e6efc74910287ef34"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP CONSTRAINT "FK_349dcb30adc4e7bfac3b9f55710"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."role_permissions" DROP CONSTRAINT "FK_2d2b5d31fe1f430250a029a8b16"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."role_permissions" DROP CONSTRAINT "FK_60c3e30d44c0e55733e97bf9c59"`,
    );
    await queryRunner.query(`DROP INDEX ${s}."UQ_roles_nombre_global"`);
    await queryRunner.query(`DROP INDEX ${s}."UQ_roles_nombre_laboratorio"`);
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" ADD CONSTRAINT "UQ_96aaed1c729577ea6fe99348402" UNIQUE ("rol_nombre")`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" DROP COLUMN "moduleModSlug"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."menus" DROP COLUMN "men_active"`,
    );
    await queryRunner.query(`ALTER TABLE ${s}."menus" DROP COLUMN "men_order"`);
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_ultimo_ingreso"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_telefono"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_documento"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP COLUMN "laboratoryLabId"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP COLUMN "rol_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP COLUMN "rol_is_system"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."roles" DROP COLUMN "rol_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_rol" text DEFAULT 'admin'`,
    );
    await queryRunner.query(`DROP TABLE ${s}."password_resets"`);
    await queryRunner.query(`DROP TABLE ${s}."role_permissions"`);
    await queryRunner.query(`DROP TABLE ${s}."modules"`);
  }
}

const SUPER_ADMIN_ID = '5a1e0000-0000-4000-8000-000000000001';
const LAB_ADMIN_ID = '5a1e0000-0000-4000-8000-000000000002';
const BACTERIOLOGIST_ID = '5a1e0000-0000-4000-8000-000000000003';
const RECEPTION_ID = '5a1e0000-0000-4000-8000-000000000004';

// [id, nombre, descripcion, rol del sistema]
const BASE_ROLES: [string, string, string, boolean][] = [
  [
    SUPER_ADMIN_ID,
    'Super administrador',
    'Administra laboratorios, menús y roles globales',
    true,
  ],
  [
    LAB_ADMIN_ID,
    'Administrador de laboratorio',
    'Todo el laboratorio: órdenes, catálogo, usuarios y roles',
    false,
  ],
  [
    BACTERIOLOGIST_ID,
    'Bacteriólogo',
    'Procesa órdenes y registra resultados',
    false,
  ],
  [RECEPTION_ID, 'Recepción', 'Registra pacientes y crea órdenes', false],
];

// [rol, modulo, ver, crear, editar, eliminar] (super administrador y administrador de laboratorio se arman con todos los modulos)
const BASE_PERMISSIONS: [string, string, boolean, boolean, boolean, boolean][] =
  [
    [BACTERIOLOGIST_ID, 'orders', true, false, true, false],
    [BACTERIOLOGIST_ID, 'results', true, true, true, false],
    [BACTERIOLOGIST_ID, 'customers', true, false, false, false],
    [BACTERIOLOGIST_ID, 'exams', true, false, false, false],
    [RECEPTION_ID, 'orders', true, true, true, true],
    [RECEPTION_ID, 'results', true, false, false, false],
    [RECEPTION_ID, 'customers', true, true, true, false],
    [RECEPTION_ID, 'exams', true, false, false, false],
    [RECEPTION_ID, 'alliances', true, false, false, false],
  ];
