// Helper para estructurar la jerarquía de resultados en una orden

/**
 * Quien firma un examen: la última persona que modificó alguno de sus resultados
 * (los resultados anteriores a la Fase 4 no tienen usuario: el examen queda sin firmante)
 */
export interface ExamSigner {
  use_id: string;
  nombre: string;
  cargo: string | null;
  registro: string | null;
  has_signature: boolean;
  // ruta en Storage: solo para el PDF, se quita en las respuestas al frontend
  firma_path?: string | null;
  updated_at: Date;
}

/**
 * Firmante de un examen a partir de sus resultados
 */
function signerOf(examResults: any[]): ExamSigner | null {
  const latest = examResults
    .filter((r) => r.updatedBy)
    .sort(
      (a, b) =>
        new Date(b.res_updated_at).getTime() -
        new Date(a.res_updated_at).getTime(),
    )[0];
  if (!latest) return null;
  const user = latest.updatedBy;
  return {
    use_id: user.use_id,
    nombre:
      [user.use_primer_nombre, user.use_primer_apellido]
        .filter(Boolean)
        .join(' ') || user.use_correo,
    cargo: user.use_cargo ?? null,
    registro: user.use_registro_profesional ?? null,
    has_signature: Boolean(user.use_firma_path),
    firma_path: user.use_firma_path ?? null,
    updated_at: latest.res_updated_at,
  };
}

/**
 * Construye una estructura jerárquica para una orden, donde cada examen contiene sus parámetros
 * y cada parámetro incluye el valor del resultado y la observación correspondiente (si existe).
 * Cada examen incluye además su firmante (`signer`).
 *
 * @param order - Objeto de la orden con relaciones cargadas (exams, parameters, results con updatedBy)
 * @returns Objeto de la orden con exámenes y parámetros enriquecidos con resultado y observación
 */
export function buildOrderResultsHierarchy(order: any) {
  // Lista de resultados asociados a la orden
  const results = order.results || [];
  // Procesar cada examen de la orden
  const exams = (order.exams || []).map((exam: any) => {
    const examResults = results.filter(
      (r: any) => r.exam?.exa_id === exam.exa_id,
    );
    // Procesar cada parámetro del examen
    const parameters = (exam.parameters || []).map((param: any) => {
      // Buscar el resultado correspondiente a este examen y parámetro
      const result = examResults.find(
        (r: any) => r.param?.par_id === param.par_id,
      );
      // Retornar el parámetro enriquecido con el valor y observación del resultado
      return {
        ...param,
        result: result ? result.res_value : null,
        observation: result ? result.res_observation : null,
        reference: result ? result.res_reference : null, // Agregar referencia del resultado si existe
        id_result: result ? result.res_id : null, // Agregar ID del resultado si existe
      };
    });
    // Retornar el examen con su lista de parámetros enriquecidos y su firmante
    return {
      ...exam,
      parameters,
      signer: signerOf(examResults),
    };
  });
  // Retornar la orden con la estructura jerárquica
  return {
    ...order,
    exams,
  };
}

/**
 * Quita de la jerarquía lo que no debe llegar al frontend (rutas de firmas en Storage)
 */
export function withoutSignaturePaths(order: any) {
  return {
    ...order,
    exams: (order.exams || []).map((exam: any) => ({
      ...exam,
      signer: exam.signer ? { ...exam.signer, firma_path: undefined } : null,
    })),
  };
}
