import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * Cuenta las filas de una tabla relacionadas con cada id (por ejemplo, adjuntos por orden)
 * con una sola consulta agrupada. Se usa sobre los ids de una página de resultados
 * @param manager EntityManager del repositorio
 * @param entity entidad hija (Attached, Order...)
 * @param foreignKey columna de la clave foránea ("orderOrdId", "customerCusId")
 * @param ids ids del padre
 * @returns mapa id → cantidad (los que no aparecen tienen 0)
 */
export async function countByForeignKey<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  foreignKey: string,
  ids: string[],
): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await manager
    .createQueryBuilder(entity, 'child')
    .select(`child.${foreignKey}`, 'id')
    .addSelect('COUNT(*)::int', 'total')
    .where(`child.${foreignKey} IN (:...ids)`, { ids })
    .groupBy(`child.${foreignKey}`)
    .getRawMany();
  return new Map(rows.map((row) => [row.id, row.total]));
}
