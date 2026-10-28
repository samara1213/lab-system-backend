import { buildResultReport, ResultReport } from './result-report.builder';

// firma de ejemplo (trazo en SVG) para la vista previa
const sampleSignature = (path: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80"><path d="${path}" fill="none" stroke="#1B2433" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ).toString('base64')}`;

const SIGNATURE_A = sampleSignature(
  'M10 55 C30 10, 45 70, 60 35 S90 20, 100 50 S130 65, 150 30 S190 45, 230 25',
);
const SIGNATURE_B = sampleSignature(
  'M12 40 C40 70, 50 10, 80 45 S120 60, 140 25 S170 40, 200 55 L228 30',
);

/**
 * Datos ficticios para la vista previa de una plantilla: un paciente de ejemplo con
 * exámenes de dos clasificaciones firmados por dos profesionales distintos
 * @param laboratory laboratorio real (nombre, contacto) o vacío para la plantilla del sistema
 * @param logo logo del laboratorio ya convertido a data: (si tiene)
 */
export function buildSampleReport(
  laboratory: Record<string, unknown> | null,
  logo: string | null,
): ResultReport {
  const signerA = {
    use_id: 'a',
    nombre: 'Laura Gómez',
    cargo: 'Bacterióloga',
    registro: 'RP-12345',
    firma_path: 'a',
  };
  const signerB = {
    use_id: 'b',
    nombre: 'Andrés Rojas',
    cargo: 'Bacteriólogo',
    registro: 'RP-67890',
    firma_path: 'b',
  };
  const hematology = {
    cla_id: '1',
    cla_name: 'HEMATOLOGÍA',
    cla_order: 1,
    cla_show_images: false,
  };
  const chemistry = {
    cla_id: '3',
    cla_name: 'QUÍMICA',
    cla_order: 3,
    cla_show_images: false,
  };
  const param = (
    name: string,
    result: string,
    unit: string,
    extra: Record<string, unknown> = {},
  ) => ({ par_name: name, result, par_unit_extent: unit, ...extra });

  const order = {
    ord_code: 1024,
    ord_created_at: new Date(),
    laboratory: laboratory ?? {
      lab_name: 'Laboratorio de ejemplo',
      lab_nit: '900123456',
      lab_dv: '7',
      lab_address: 'Calle 10 # 20-30',
      lab_phone: '601 555 0101',
      lab_email: 'contacto@laboratorio.test',
      lab_legal_representative: 'Representante legal',
    },
    customer: {
      cus_first_name: 'María',
      cus_second_name: 'Fernanda',
      cus_first_lastname: 'Pérez',
      cus_second_lastname: 'López',
      cus_document_type: 'CC',
      cus_document_number: '1000000000',
      cus_birthdate: '1990-04-15',
      cus_gender: 'FEMENINO',
      cus_phone: '300 000 0000',
      cus_email: 'paciente@correo.test',
    },
    exams: [
      {
        exa_name: 'Cuadro hemático',
        classification: hematology,
        signer: signerA,
        parameters: [
          param('*Serie roja', '', ''),
          param('Hemoglobina', '13.8', 'g/dL', {
            par_range: true,
            par_min_man: '13.5',
            par_max_man: '17.5',
            par_min_woman: '12.0',
            par_max_woman: '15.5',
            par_min_child: '11.0',
            par_max_child: '14.0',
          }),
          param('Hematocrito', '41', '%', {
            par_range: true,
            par_min_man: '41',
            par_max_man: '53',
            par_min_woman: '36',
            par_max_woman: '46',
          }),
          param('*Serie blanca', '', ''),
          param('Leucocitos', '6.800', '/mm³', {
            par_reference_value: '4.500 - 11.000',
          }),
        ].map((p, i) => ({ ...p, par_order: i })),
      },
      {
        exa_name: 'Hemoclasificación',
        classification: hematology,
        signer: signerA,
        parameters: [
          param('Grupo sanguíneo', 'O', '', { observation: '' }),
          param('Factor Rh', 'Positivo', ''),
        ],
      },
      {
        exa_name: 'Glicemia basal',
        classification: chemistry,
        signer: signerB,
        parameters: [
          param('Glucosa', '92', 'mg/dL', {
            par_reference_value: '70 - 100',
            observation: 'Muestra tomada en ayunas.',
          }),
        ],
      },
    ],
  };

  return buildResultReport(order, {
    logo,
    labSignature: null,
    signatures: new Map([
      ['a', SIGNATURE_A],
      ['b', SIGNATURE_B],
    ]),
    attachments: [],
  });
}
