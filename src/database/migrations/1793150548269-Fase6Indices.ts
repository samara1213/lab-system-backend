import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 6: índices para los listados paginados y las claves foráneas sin índice.
 * - orders: (laboratorio, estado, ingreso) para el dashboard y el filtro por estado;
 *   (laboratorio, ingreso) para Buscar órdenes sin estado; paciente (historial).
 * - attached (orden), usuarios (laboratorio), exams_parameters (examen), alliances (laboratorio).
 * No modifica datos. CREATE INDEX bloquea escrituras en la tabla mientras se crea (segundos con
 * el volumen actual); aplicarla fuera del horario de atención.
 */
const INDEXES: [name: string, table: string, columns: string][] = [
  ['IDX_99cc14c9c08bfcd22534f02b7a', 'usuarios', '"laboratoryLabId"'],
  ['IDX_c4bc36cdaa976de7e277d83405', 'exams_parameters', '"examExaId"'],
  ['IDX_a91c2af2ee8e36437570cf7b72', 'attached', '"orderOrdId"'],
  ['IDX_a7103a3834c17b3fdd0292a28a', 'orders', '"customerCusId"'],
  ['IDX_orders_lab_created', 'orders', '"laboratoryLabId", "ord_created_at"'],
  [
    'IDX_orders_lab_status_created',
    'orders',
    '"laboratoryLabId", "ord_status", "ord_created_at"',
  ],
  ['IDX_dd70fb37bc0b82f35b7b49d341', 'alliances', '"laboratoryLabId"'],
];

export class Fase6Indices1793150548269 implements MigrationInterface {
  name = 'Fase6Indices1793150548269';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;
    for (const [name, table, columns] of INDEXES)
      await queryRunner.query(
        `CREATE INDEX "${name}" ON ${s}."${table}" (${columns})`,
      );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const s = `"${process.env.DB_SCHEMA || 'public'}"`;
    for (const [name] of [...INDEXES].reverse())
      await queryRunner.query(`DROP INDEX ${s}."${name}"`);
  }
}
