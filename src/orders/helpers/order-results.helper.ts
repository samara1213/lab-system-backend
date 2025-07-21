// Helper para estructurar la jerarquía de resultados en una orden
/**
 * Construye una estructura jerárquica para una orden, donde cada examen contiene sus parámetros
 * y cada parámetro incluye el valor del resultado y la observación correspondiente (si existe).
 *
 * @param order - Objeto de la orden con relaciones cargadas (exams, parameters, results)
 * @returns Objeto de la orden con exámenes y parámetros enriquecidos con resultado y observación
 */
export function buildOrderResultsHierarchy(order: any) {
    
  // Lista de resultados asociados a la orden
  const results = order.results || [];
  // Procesar cada examen de la orden
  const exams = (order.exams || []).map((exam: any) => {
    // Procesar cada parámetro del examen
    const parameters = (exam.parameters || []).map((param: any) => {
      // Buscar el resultado correspondiente a este examen y parámetro
      const result = results.find((r: any) =>
        r.exam?.exa_id === exam.exa_id &&
        r.param?.par_id === param.par_id
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
    // Retornar el examen con su lista de parámetros enriquecidos
    return {
      ...exam,
      parameters
    };
  });
  // Retornar la orden con la estructura jerárquica
  return {
    ...order,
    exams,
  };
}
