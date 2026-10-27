import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 4: firma del profesional y trazabilidad de resultados.
 * - usuarios: ruta de la firma en Storage, cargo y registro profesional.
 * - results: quién registró y quién modificó por última vez cada resultado (vacío en
 *   los anteriores) e índice por orden y parámetro para el guardado en lote.
 * No modifica datos existentes.
 */

export class Fase4FirmaYTrazabilidad1793061519520 implements MigrationInterface {
  name = 'Fase4FirmaYTrazabilidad1793061519520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_firma_path" text`,
    );
    await queryRunner.query(`ALTER TABLE ${s}."usuarios" ADD "use_cargo" text`);
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" ADD "use_registro_profesional" text`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" ADD "res_registered_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" ADD "res_updated_by" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_results_order_param" ON ${s}."results"  ("orderOrdId", "paramParId") `,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" ADD CONSTRAINT "FK_bfdff12dd97c2d76f2a8aa6c6f1" FOREIGN KEY ("res_registered_by") REFERENCES ${s}."usuarios"("use_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" ADD CONSTRAINT "FK_746b22d0a05a00b2b28583db024" FOREIGN KEY ("res_updated_by") REFERENCES ${s}."usuarios"("use_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;

    await queryRunner.query(
      `ALTER TABLE ${s}."results" DROP CONSTRAINT "FK_746b22d0a05a00b2b28583db024"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" DROP CONSTRAINT "FK_bfdff12dd97c2d76f2a8aa6c6f1"`,
    );
    await queryRunner.query(`DROP INDEX ${s}."IDX_results_order_param"`);
    await queryRunner.query(
      `ALTER TABLE ${s}."results" DROP COLUMN "res_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."results" DROP COLUMN "res_registered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_registro_profesional"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_cargo"`,
    );
    await queryRunner.query(
      `ALTER TABLE ${s}."usuarios" DROP COLUMN "use_firma_path"`,
    );
  }
}
