import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 5: plantillas PDF por laboratorio y clasificaciones de exámenes.
 * - exam_classifications: reemplaza el mapa fijo de pdf.service.ts. Se siembran las 8 actuales
 *   como clasificaciones del sistema (ids fijos) y cada examen se enlaza según su código
 *   "exa_classification" ("1" a "8"); la columna anterior se conserva hasta la Fase 7.
 * - pdf_templates: plantillas Handlebars (contenido en la base, máximo 256 KB), una activa por
 *   laboratorio y una del sistema. Sin filas = se usa la plantilla incluida en el backend.
 * - Módulo de permisos "pdf_templates" (global: solo super administrador) y opciones de menú
 *   "Clasificaciones" (junto a Exámenes) y "Plantillas PDF" (junto a Laboratorios), si esas opciones existen.
 */

// clasificaciones anteriores: código, nombre, si la sección mostraba las imágenes adjuntas
const CLASSIFICATIONS: [string, string, boolean][] = [
  ['1', 'HEMATOLOGÍA', true],
  ['2', 'HEMATOLOGÍA', false],
  ['3', 'QUÍMICA', false],
  ['4', 'INMUNOLOGÍA', false],
  ['5', 'MICROSCOPÍA', false],
  ['6', 'MACROSCOPÍA', false],
  ['7', 'MICROBIOLOGÍA', false],
  ['8', 'HORMONAS', false],
];
const classificationId = (code: string) =>
  `c1a50000-0000-4000-8000-00000000000${code}`;

// opciones de menú nuevas: id, nombre, url, icono, módulo, url de la opción junto a la que van
const MENUS: [string, string, string, string, string, string][] = [
  [
    'c1a50000-0000-4000-8000-0000000000a1',
    'Clasificaciones',
    '/exam-classifications',
    'mdi:shape-outline',
    'exams',
    'exams',
  ],
  [
    'c1a50000-0000-4000-8000-0000000000a2',
    'Plantillas PDF',
    '/pdf-templates',
    'mdi:file-document-edit-outline',
    'pdf_templates',
    'laboratories',
  ],
];

export class Fase5PlantillasYClasificaciones1793147984591 implements MigrationInterface {
  name = 'Fase5PlantillasYClasificaciones1793147984591';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    // --- esquema ---
    await queryRunner.query(
      `CREATE TABLE ${s}."exam_classifications" ("cla_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cla_name" text NOT NULL, "cla_order" integer NOT NULL DEFAULT '0', "cla_show_images" boolean NOT NULL DEFAULT false, "cla_active" boolean NOT NULL DEFAULT true, "cla_created_at" TIMESTAMP NOT NULL DEFAULT now(), "cla_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "laboratoryLabId" uuid, CONSTRAINT "PK_27c7bd5c1719e9025374b79fbc3" PRIMARY KEY ("cla_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a1070c941c9ef64f7195b170b" ON ${s}."exam_classifications"  ("laboratoryLabId") `,
    );
    await queryRunner.query(
      `CREATE TABLE ${s}."pdf_templates" ("tpl_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tpl_name" text NOT NULL, "tpl_description" text, "tpl_content" text NOT NULL, "tpl_sha256" text NOT NULL, "tpl_size" integer NOT NULL, "tpl_active" boolean NOT NULL DEFAULT false, "tpl_created_at" TIMESTAMP NOT NULL DEFAULT now(), "tpl_updated_at" TIMESTAMP NOT NULL DEFAULT now(), "laboratoryLabId" uuid, "tpl_created_by" uuid, CONSTRAINT "PK_efcd260dede51725b543e5043ef" PRIMARY KEY ("tpl_id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pdf_templates_active_system" ON ${s}."pdf_templates"  ("tpl_active") WHERE "tpl_active" AND "laboratoryLabId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_pdf_templates_active_lab" ON ${s}."pdf_templates"  ("laboratoryLabId") WHERE "tpl_active" AND "laboratoryLabId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."exams" ADD "classificationClaId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be1f8ed2ff67b625456ac83b31" ON ${s}."exams"  ("classificationClaId") `,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."exam_classifications" ADD CONSTRAINT "FK_5a1070c941c9ef64f7195b170b3" FOREIGN KEY ("laboratoryLabId") REFERENCES ${s}."laboratories"("lab_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."exams" ADD CONSTRAINT "FK_be1f8ed2ff67b625456ac83b315" FOREIGN KEY ("classificationClaId") REFERENCES ${s}."exam_classifications"("cla_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."pdf_templates" ADD CONSTRAINT "FK_54c1f2f77a57451fbbc7fe45697" FOREIGN KEY ("laboratoryLabId") REFERENCES ${s}."laboratories"("lab_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."pdf_templates" ADD CONSTRAINT "FK_8cf26a317af64e646b74b7ced4b" FOREIGN KEY ("tpl_created_by") REFERENCES ${s}."usuarios"("use_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // --- clasificaciones del sistema y enlace de los exámenes por su código ---
    for (const [code, name, showImages] of CLASSIFICATIONS) {
      await queryRunner.query(
        `INSERT INTO ${s}."exam_classifications" ("cla_id", "cla_name", "cla_order", "cla_show_images") VALUES ($1, $2, $3, $4)`,
        [classificationId(code), name, Number(code), showImages],
      );
      await queryRunner.query(
        `UPDATE ${s}."exams" SET "classificationClaId" = $1 WHERE trim("exa_classification") = $2`,
        [classificationId(code), code],
      );
    }

    // --- módulo de permisos (global: solo roles del sistema, que ya tienen todo) ---
    await queryRunner.query(
      `INSERT INTO ${s}."modules" ("mod_slug", "mod_name", "mod_description", "mod_order", "mod_global", "mod_actions") VALUES
            ('pdf_templates', 'Plantillas PDF', 'Plantillas del PDF de resultados por laboratorio (solo super administrador)', 10, true, '{view,create,update,delete}')`,
    );

    // --- opciones de menú: al final del grupo de la opción indicada; si esa opción no existe
    //     (base nueva sin menús) no se crean: el super administrador las agrega en Menús ---
    for (const [id, name, url, icon, module, siblingUrl] of MENUS) {
      await queryRunner.query(
        `WITH sibling AS (
                SELECT "menParentMenId" AS parent, "men_level" AS level FROM ${s}."menus"
                WHERE lower(trim(both '/' from trim("men_url"))) = $6
                ORDER BY "men_level" LIMIT 1
            )
            INSERT INTO ${s}."menus" ("men_id", "men_name", "men_url", "men_icon", "moduleModSlug", "menParentMenId", "men_level", "men_order")
            SELECT $1, $2, $3, $4, $5, sibling.parent, sibling.level,
                COALESCE((SELECT max(m."men_order") + 1 FROM ${s}."menus" m WHERE m."menParentMenId" IS NOT DISTINCT FROM sibling.parent), 1)
            FROM sibling`,
        [id, name, url, icon, module, siblingUrl],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    await queryRunner.query(
      `DELETE FROM ${s}."menus" WHERE "men_id" = ANY($1)`,
      [MENUS.map(([id]) => id)],
    );
    // permisos que se hayan dado sobre el módulo antes de quitarlo
    await queryRunner.query(
      `DELETE FROM ${s}."role_permissions" WHERE "moduleModSlug" = 'pdf_templates'`,
    );
    await queryRunner.query(
      `DELETE FROM ${s}."modules" WHERE "mod_slug" = 'pdf_templates'`,
    );

    await queryRunner.query(
      `ALTER TABLE ${s}."pdf_templates" DROP CONSTRAINT "FK_8cf26a317af64e646b74b7ced4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."pdf_templates" DROP CONSTRAINT "FK_54c1f2f77a57451fbbc7fe45697"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."exams" DROP CONSTRAINT "FK_be1f8ed2ff67b625456ac83b315"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."exam_classifications" DROP CONSTRAINT "FK_5a1070c941c9ef64f7195b170b3"`,
    );
    await queryRunner.query(`DROP INDEX ${s}."IDX_be1f8ed2ff67b625456ac83b31"`);
    await queryRunner.query(
      `ALTER TABLE ${s}."exams" DROP COLUMN "classificationClaId"`,
    );
    await queryRunner.query(`DROP INDEX ${s}."UQ_pdf_templates_active_lab"`);
    await queryRunner.query(`DROP INDEX ${s}."UQ_pdf_templates_active_system"`);
    await queryRunner.query(`DROP TABLE ${s}."pdf_templates"`);
    await queryRunner.query(`DROP INDEX ${s}."IDX_5a1070c941c9ef64f7195b170b"`);
    await queryRunner.query(`DROP TABLE ${s}."exam_classifications"`);
  }
}
