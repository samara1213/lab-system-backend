import {
  buildResultReport,
  formatAge,
  ReportImages,
} from './result-report.builder';

const images = (overrides: Partial<ReportImages> = {}): ReportImages => ({
  logo: 'data:image/png;base64,LOGO',
  labSignature: 'data:image/png;base64,LAB',
  signatures: new Map([['firmas/a.png', 'data:image/png;base64,A']]),
  attachments: ['data:image/jpeg;base64,ADJ'],
  ...overrides,
});

const signerA = {
  use_id: 'a',
  nombre: 'Laura Gómez',
  cargo: 'Bacterióloga',
  registro: 'RP-1',
  firma_path: 'firmas/a.png',
};
const signerB = {
  use_id: 'b',
  nombre: 'Andrés Rojas',
  cargo: null,
  registro: null,
  firma_path: null,
};
const hematology = {
  cla_id: 'h',
  cla_name: 'HEMATOLOGÍA',
  cla_order: 1,
  cla_show_images: true,
};
const chemistry = {
  cla_id: 'q',
  cla_name: 'QUÍMICA',
  cla_order: 3,
  cla_show_images: false,
};

const order = {
  ord_code: 7,
  ord_created_at: '2026-10-20T14:30:00.000Z',
  laboratory: { lab_name: 'Lab A', lab_nit: '900', lab_dv: '1' },
  customer: {
    cus_first_name: 'Ana',
    cus_second_name: null,
    cus_first_lastname: 'Ruiz',
    cus_second_lastname: '',
    cus_birthdate: '2000-02-29',
  },
  exams: [
    {
      exa_name: 'Sin clasificar',
      classification: null,
      signer: null,
      parameters: [],
    },
    {
      exa_name: 'Glicemia',
      classification: chemistry,
      signer: signerB,
      parameters: [
        { par_name: 'Glucosa', result: '90', par_reference_value: '70 - 100' },
      ],
    },
    {
      exa_name: 'Hemograma',
      classification: hematology,
      signer: signerA,
      parameters: [
        { par_name: '*Serie roja', par_order: 1 },
        {
          par_name: 'Hemoglobina',
          par_order: 2,
          result: '14.0',
          par_range: true,
          par_min_man: '13.50',
          par_max_man: '17.5',
          par_min_child: null,
          par_max_child: null,
        },
        { par_name: '*Vacía', par_order: 6 },
        { par_name: 'Sin dato', par_order: 7, result: '-' },
        {
          par_name: 'Con referencia propia',
          par_order: 5,
          result: '3',
          par_range: true,
          reference: 'Ver nota',
          observation: 'Repetir',
        },
      ],
    },
    {
      exa_name: 'Hemoclasificación',
      classification: hematology,
      signer: signerA,
      parameters: [{ par_name: 'Grupo', result: 'O', observation: 'Repetir' }],
    },
  ],
};

describe('buildResultReport', () => {
  const report = buildResultReport(
    order,
    images(),
    new Date('2026-10-27T15:00:00Z'),
  );

  it('agrupa por clasificación en su orden y deja "sin clasificación" al final', () => {
    expect(report.clasificaciones.map((c) => c.nombre)).toEqual([
      'HEMATOLOGÍA',
      'QUÍMICA',
      'OTROS EXÁMENES',
    ]);
    expect(report.clasificaciones[0].examenes.map((e) => e.nombre)).toEqual([
      'Hemograma',
      'Hemoclasificación',
    ]);
  });

  it('solo imprime parámetros con resultado y los subtítulos que tienen alguno debajo', () => {
    const params = report.clasificaciones[0].examenes[0].parametros;
    expect(params.map((p) => [p.nombre, p.es_titulo])).toEqual([
      ['Serie roja', true],
      ['Hemoglobina', false],
      ['Con referencia propia', false],
    ]);
  });

  it('arma los rangos por grupo y prioriza la referencia escrita en el resultado', () => {
    const [, hemoglobin, own] =
      report.clasificaciones[0].examenes[0].parametros;
    expect(hemoglobin.rangos).toEqual([
      { grupo: 'Hombres', minimo: '13.5', maximo: '17.5' },
    ]);
    expect(own).toMatchObject({ referencia: 'Ver nota', rangos: [] });
    expect(report.clasificaciones[1].examenes[0].parametros[0].referencia).toBe(
      '70 - 100',
    );
  });

  it('incluye el firmante de cada examen con su firma y la muestra tras el último examen seguido del mismo firmante', () => {
    const [hemogram, bloodType] = report.clasificaciones[0].examenes;
    expect(hemogram.firmante).toEqual({
      nombre: 'Laura Gómez',
      cargo: 'Bacterióloga',
      registro: 'RP-1',
      firma: 'data:image/png;base64,A',
    });
    expect(hemogram.mostrar_firma).toBe(false);
    expect(bloodType.mostrar_firma).toBe(true);
    expect(report.clasificaciones[1].examenes[0].firmante).toEqual({
      nombre: 'Andrés Rojas',
      cargo: '',
      registro: '',
      firma: null,
    });
    expect(report.clasificaciones[2].examenes[0].firmante).toBeNull();
  });

  it('deja observaciones únicas por examen e imágenes solo en las clasificaciones que las muestran', () => {
    expect(report.clasificaciones[0].examenes[0].observaciones).toEqual([
      'Repetir',
    ]);
    expect(report.clasificaciones[0].imagenes).toEqual([
      'data:image/jpeg;base64,ADJ',
    ]);
    expect(report.clasificaciones[1].imagenes).toEqual([]);
  });

  it('formatea paciente, laboratorio y orden', () => {
    expect(report.paciente.nombre).toBe('Ana Ruiz');
    expect(report.paciente.fecha_nacimiento).toBe('29/02/2000');
    expect(report.laboratorio).toMatchObject({
      nombre: 'Lab A',
      nit: '900-1',
      logo: 'data:image/png;base64,LOGO',
      firma: 'data:image/png;base64,LAB',
    });
    expect(report.orden.codigo).toBe('7');
    expect(report.orden.fecha_ingreso).toMatch(/20\/10\/(20)?26/);
  });
});

describe('formatAge', () => {
  it('calcula años, meses y días en la zona horaria de Colombia', () => {
    expect(formatAge('1990-04-15', new Date('2026-10-27T15:00:00Z'))).toBe(
      '36 años, 6 meses, 12 días',
    );
    // 27-oct 02:00 UTC todavía es 26-oct en Bogotá
    expect(formatAge('1990-04-15', new Date('2026-10-27T02:00:00Z'))).toBe(
      '36 años, 6 meses, 11 días',
    );
  });

  it('usa los días reales del mes anterior', () => {
    expect(formatAge('2026-01-31', new Date('2026-03-01T15:00:00Z'))).toBe(
      '0 años, 1 mes, 1 día',
    );
    expect(formatAge('2000-02-29', new Date('2027-02-28T15:00:00Z'))).toBe(
      '26 años, 11 meses, 30 días',
    );
  });

  it('devuelve vacío sin fecha o con una fecha futura', () => {
    expect(formatAge(null, new Date())).toBe('');
    expect(formatAge('2999-01-01', new Date())).toBe('');
  });
});
