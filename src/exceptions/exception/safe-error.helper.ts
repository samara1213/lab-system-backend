/**
 * Describe un error para los logs sin datos sensibles: solo tipo, codigo y
 * mensaje. Nunca incluye `parameters`/`query` (QueryFailedError) ni `detail` de
 * Postgres, que pueden traer correos, hashes o datos de pacientes
 * @param error error capturado
 * @returns texto seguro para registrar
 */
export function describeError(error: any): string {

  if (!error) return 'Error desconocido';

  const name = error.name ?? error.constructor?.name ?? 'Error';
  const code = error.code ? ` [${error.code}]` : '';
  const message = typeof error.message === 'string' ? error.message.slice(0, 300) : '';

  return `${name}${code}: ${message}`;
}
