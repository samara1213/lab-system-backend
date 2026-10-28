-- Auditoría de integridad de datos (Fase 6). SOLO LECTURA: no modifica nada.
-- Devuelve una fila por revisión con la cantidad de registros con problema (nunca datos de pacientes).
-- Uso:  psql "<url de la base>" -v schema=lab -f scripts/auditoria-integridad.sql
-- (en producción, con un usuario de solo lectura o dentro de una transacción READ ONLY)

BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path TO :"schema";

SELECT revision, cantidad, CASE WHEN cantidad = 0 THEN 'ok' ELSE 'revisar' END AS estado
FROM (
  -- aislamiento entre laboratorios
  SELECT 1 AS n, 'Órdenes cuyo paciente es de otro laboratorio' AS revision,
    (SELECT count(*) FROM orders o JOIN customers c ON c.cus_id = o."customerCusId"
      WHERE c."laboratoryLabId" IS DISTINCT FROM o."laboratoryLabId") AS cantidad
  UNION ALL SELECT 2, 'Exámenes de una orden que son de otro laboratorio',
    (SELECT count(*) FROM orders_exams oe JOIN orders o ON o.ord_id = oe.ord_id JOIN exams e ON e.exa_id = oe.exa_id
      WHERE e."laboratoryLabId" IS DISTINCT FROM o."laboratoryLabId")
  UNION ALL SELECT 3, 'Exámenes con convenio de otro laboratorio',
    (SELECT count(*) FROM exams e JOIN alliances a ON a.ali_id = e."allianceAliId"
      WHERE a."laboratoryLabId" IS DISTINCT FROM e."laboratoryLabId")
  UNION ALL SELECT 4, 'Exámenes con clasificación de otro laboratorio',
    (SELECT count(*) FROM exams e JOIN exam_classifications c ON c.cla_id = e."classificationClaId"
      WHERE c."laboratoryLabId" IS NOT NULL AND c."laboratoryLabId" IS DISTINCT FROM e."laboratoryLabId")
  UNION ALL SELECT 5, 'Usuarios con un rol de otro laboratorio',
    (SELECT count(*) FROM usuarios u JOIN roles r ON r.rol_id = u."roleRolId"
      WHERE r."laboratoryLabId" IS NOT NULL AND r."laboratoryLabId" IS DISTINCT FROM u."laboratoryLabId")
  UNION ALL SELECT 6, 'Usuarios sin laboratorio (no pueden operar)',
    (SELECT count(*) FROM usuarios WHERE "laboratoryLabId" IS NULL)
  UNION ALL SELECT 7, 'Usuarios sin rol',
    (SELECT count(*) FROM usuarios WHERE "roleRolId" IS NULL)

  -- resultados
  UNION ALL SELECT 10, 'Resultados de un examen que no está en su orden',
    (SELECT count(*) FROM results r WHERE NOT EXISTS (
      SELECT 1 FROM orders_exams oe WHERE oe.ord_id = r."orderOrdId" AND oe.exa_id = r."examExaId"))
  UNION ALL SELECT 11, 'Resultados con un parámetro de otro examen',
    (SELECT count(*) FROM results r JOIN exams_parameters p ON p.par_id = r."paramParId"
      WHERE p."examExaId" IS DISTINCT FROM r."examExaId")
  UNION ALL SELECT 12, 'Parámetros con más de un resultado en la misma orden',
    (SELECT count(*) FROM (SELECT 1 FROM results GROUP BY "orderOrdId", "paramParId" HAVING count(*) > 1) d)
  UNION ALL SELECT 13, 'Resultados sin orden, examen o parámetro',
    (SELECT count(*) FROM results WHERE "orderOrdId" IS NULL OR "examExaId" IS NULL OR "paramParId" IS NULL)

  -- órdenes
  UNION ALL SELECT 20, 'Órdenes sin exámenes',
    (SELECT count(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM orders_exams oe WHERE oe.ord_id = o.ord_id))
  UNION ALL SELECT 21, 'Órdenes finalizadas sin PDF',
    (SELECT count(*) FROM orders WHERE ord_status = 'FINALIZADA' AND (ord_pdf_url IS NULL OR ord_pdf_url = ''))
  UNION ALL SELECT 22, 'Órdenes "pendiente de PDF" sin resultados',
    (SELECT count(*) FROM orders o WHERE ord_status = 'PENDIENTE PDF'
      AND NOT EXISTS (SELECT 1 FROM results r WHERE r."orderOrdId" = o.ord_id))
  UNION ALL SELECT 23, 'Órdenes con un estado desconocido',
    (SELECT count(*) FROM orders WHERE ord_status NOT IN
      ('PENDIENTE', 'PROCESANDO', 'ORDEN CON ADJUNTO', 'PENDIENTE PDF', 'FINALIZADA', 'CANCELADA'))
  UNION ALL SELECT 24, 'Órdenes con valores negativos o descuento fuera de 0 a 100 %',
    (SELECT count(*) FROM orders WHERE ord_total_value < 0 OR ord_discount_value < 0
      OR ord_discount_percentage < 0 OR ord_discount_percentage > 100)
  UNION ALL SELECT 25, 'Órdenes con más de un adjunto (la aplicación maneja uno)',
    (SELECT count(*) FROM (SELECT 1 FROM attached GROUP BY "orderOrdId" HAVING count(*) > 1) d)

  -- catálogo
  UNION ALL SELECT 30, 'Exámenes sin clasificación (salen en "Otros exámenes")',
    (SELECT count(*) FROM exams WHERE "classificationClaId" IS NULL)
  UNION ALL SELECT 31, 'Exámenes sin parámetros',
    (SELECT count(*) FROM exams e WHERE NOT EXISTS (SELECT 1 FROM exams_parameters p WHERE p."examExaId" = e.exa_id))
  UNION ALL SELECT 32, 'Parámetros con rango pero sin ningún límite',
    (SELECT count(*) FROM exams_parameters WHERE par_range AND par_min_man IS NULL AND par_max_man IS NULL
      AND par_min_woman IS NULL AND par_max_woman IS NULL AND par_min_child IS NULL AND par_max_child IS NULL)
  UNION ALL SELECT 33, 'Parámetros con un mínimo mayor que su máximo',
    (SELECT count(*) FROM exams_parameters WHERE par_min_man > par_max_man
      OR par_min_woman > par_max_woman OR par_min_child > par_max_child)
  UNION ALL SELECT 34, 'Exámenes con precio negativo',
    (SELECT count(*) FROM exams WHERE exa_price < 0)

  -- pacientes (datos que usan los rangos y el correo)
  UNION ALL SELECT 40, 'Pacientes sin correo (no reciben resultados)',
    (SELECT count(*) FROM customers WHERE cus_email IS NULL OR trim(cus_email) = '')
  UNION ALL SELECT 41, 'Pacientes con género fuera de F, M u O',
    (SELECT count(*) FROM customers WHERE cus_gender IS NULL OR cus_gender NOT IN ('F', 'M', 'O'))
  UNION ALL SELECT 42, 'Pacientes con fecha de nacimiento futura o anterior a 1900',
    (SELECT count(*) FROM customers WHERE cus_birthdate > current_date OR cus_birthdate < date '1900-01-01')

  -- menús y permisos
  UNION ALL SELECT 50, 'Opciones de menú con url y sin módulo (nadie las ve)',
    (SELECT count(*) FROM menus WHERE men_url IS NOT NULL AND trim(men_url) <> '' AND "moduleModSlug" IS NULL)
  UNION ALL SELECT 51, 'Opciones de menú de más de 3 niveles',
    (SELECT count(*) FROM menus WHERE men_level > 3)
  UNION ALL SELECT 52, 'Roles no del sistema con permisos de módulos globales',
    (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.rol_id = rp."roleRolId"
      JOIN modules m ON m.mod_slug = rp."moduleModSlug" WHERE m.mod_global AND NOT r.rol_is_system)
) revisiones
ORDER BY n;

ROLLBACK;
