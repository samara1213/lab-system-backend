/**
 * Datos que recibe una plantilla del PDF de resultados (contrato documentado en la pantalla
 * "Plantillas PDF"). Todo llega como texto ya formateado; las imágenes como `data:`.
 */
export interface ResultReport {
  laboratorio: {
    nombre: string;
    nit: string;
    direccion: string;
    telefono: string;
    correo: string;
    representante: string;
    logo: string | null;
    // firma del laboratorio: se usa en los exámenes sin firmante (resultados anteriores a la Fase 4)
    firma: string | null;
  };
  paciente: {
    nombre: string;
    tipo_documento: string;
    documento: string;
    fecha_nacimiento: string;
    edad: string;
    genero: string;
    telefono: string;
    correo: string;
  };
  orden: {
    codigo: string;
    fecha_ingreso: string;
    fecha_generacion: string;
  };
  clasificaciones: ReportClassification[];
  // imágenes adjuntas a la orden (también en las clasificaciones con mostrar_imagenes)
  imagenes: string[];
}

export interface ReportClassification {
  nombre: string;
  mostrar_imagenes: boolean;
  imagenes: string[];
  examenes: ReportExam[];
}

export interface ReportExam {
  nombre: string;
  parametros: ReportParameter[];
  observaciones: string[];
  firmante: ReportSigner | null;
  // true si es el último examen seguido del mismo firmante en su clasificación: la plantilla
  // base imprime la firma ahí para no repetirla en cada examen
  mostrar_firma: boolean;
}

export interface ReportParameter {
  nombre: string;
  // fila de subtítulo dentro de la tabla (parámetros cuyo nombre empieza por "*")
  es_titulo: boolean;
  resultado: string;
  unidad: string;
  // referencia escrita en el resultado o valor de referencia del parámetro
  referencia: string;
  // rangos por grupo cuando el parámetro tiene rango (Hombres, Mujeres, Niños)
  rangos: { grupo: string; minimo: string; maximo: string }[];
}

export interface ReportSigner {
  nombre: string;
  cargo: string;
  registro: string;
  firma: string | null;
}

/**
 * Imágenes ya descargadas y convertidas a `data:` (las descarga PdfService en paralelo)
 */
export interface ReportImages {
  logo: string | null;
  labSignature: string | null;
  // firma de cada profesional, por ruta en Storage
  signatures: Map<string, string | null>;
  attachments: string[];
}

const TIME_ZONE = 'America/Bogota';
const UNCLASSIFIED = 'OTROS EXÁMENES';

const text = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).trim();

const joinName = (...parts: unknown[]) =>
  parts.map(text).filter(Boolean).join(' ');

// "4.50" → "4.5"; los textos se dejan igual
const formatNumber = (value: unknown) => {
  const raw = text(value);
  return raw !== '' && /^-?\d+(\.\d+)?$/.test(raw) ? String(Number(raw)) : raw;
};

/**
 * Fecha (sin hora) de una columna date ("2019-03-05") o Date, como día/mes/año
 */
function parseDateOnly(
  value: unknown,
): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const match = String(
    value instanceof Date ? value.toISOString() : value,
  ).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
    : null;
}

function todayInBogota(now: Date) {
  const [y, m, d] = now
    .toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
    .split('-')
    .map(Number);
  return { y, m, d };
}

/**
 * Edad exacta en años, meses y días a la fecha de generación
 */
export function formatAge(birthdate: unknown, now: Date): string {
  const birth = parseDateOnly(birthdate);
  if (!birth) return '';
  const today = todayInBogota(now);
  let years = today.y - birth.y;
  let months = today.m - birth.m;
  if (today.d < birth.d) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return '';

  // días desde el último "cumplemes" (un 31 cae el último día de los meses más cortos)
  const anchorMonth = birth.m - 1 + months;
  const anchorYear = birth.y + years + Math.floor(anchorMonth / 12);
  const monthIndex = anchorMonth % 12;
  const daysInMonth = new Date(
    Date.UTC(anchorYear, monthIndex + 1, 0),
  ).getUTCDate();
  const anchor = Date.UTC(
    anchorYear,
    monthIndex,
    Math.min(birth.d, daysInMonth),
  );
  const days = Math.round(
    (Date.UTC(today.y, today.m - 1, today.d) - anchor) / 86_400_000,
  );

  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  return `${plural(years, 'año', 'años')}, ${plural(months, 'mes', 'meses')}, ${plural(days, 'día', 'días')}`;
}

const formatDateTime = (value: unknown) =>
  value
    ? new Date(value as string).toLocaleString('es-CO', {
        timeZone: TIME_ZONE,
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

const formatBirthdate = (value: unknown) => {
  const date = parseDateOnly(value);
  return date
    ? `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`
    : '';
};

const isEmptyResult = (value: unknown) => ['', '-'].includes(text(value));

/**
 * Parámetros que se imprimen: con resultado, y los subtítulos que tienen alguno debajo
 */
function buildParameters(parameters: any[]): ReportParameter[] {
  const sorted = [...(parameters ?? [])].sort(
    (a, b) => (a.par_order ?? 0) - (b.par_order ?? 0),
  );
  const rows: ReportParameter[] = [];
  let pendingTitle: ReportParameter | null = null;

  for (const param of sorted) {
    const name = text(param.par_name);
    if (name.startsWith('*')) {
      pendingTitle = {
        nombre: name.substring(1).trim(),
        es_titulo: true,
        resultado: '',
        unidad: '',
        referencia: '',
        rangos: [],
      };
      continue;
    }
    if (isEmptyResult(param.result)) continue;

    if (pendingTitle) {
      rows.push(pendingTitle);
      pendingTitle = null;
    }
    const groups: [string, unknown, unknown][] = [
      ['Hombres', param.par_min_man, param.par_max_man],
      ['Mujeres', param.par_min_woman, param.par_max_woman],
      ['Niños', param.par_min_child, param.par_max_child],
    ];
    const reference = text(param.reference);
    rows.push({
      nombre: name,
      es_titulo: false,
      resultado: text(param.result),
      unidad: text(param.par_unit_extent),
      referencia:
        reference || (param.par_range ? '' : text(param.par_reference_value)),
      rangos:
        reference || !param.par_range
          ? []
          : groups
              .map(([grupo, min, max]) => ({
                grupo,
                minimo: formatNumber(min),
                maximo: formatNumber(max),
              }))
              .filter((range) => range.minimo !== '' || range.maximo !== ''),
    });
  }
  return rows;
}

function buildSigner(signer: any, images: ReportImages): ReportSigner | null {
  if (!signer) return null;
  return {
    nombre: text(signer.nombre),
    cargo: text(signer.cargo),
    registro: text(signer.registro),
    firma: signer.firma_path
      ? (images.signatures.get(signer.firma_path) ?? null)
      : null,
  };
}

/**
 * Arma los datos del reporte a partir de la orden con resultados
 * (buildOrderResultsHierarchy, con exams.classification y firmantes)
 * @param order orden con laboratorio, paciente y exámenes con parámetros y resultados
 * @param images imágenes ya descargadas
 * @param now fecha de generación
 * @returns datos para la plantilla
 */
export function buildResultReport(
  order: any,
  images: ReportImages,
  now: Date = new Date(),
): ResultReport {
  const lab = order.laboratory ?? {};
  const customer = order.customer ?? {};

  // agrupar por clasificación, en el orden de la clasificación (sin clasificación al final)
  const groups = new Map<
    string,
    { order: number; name: string; showImages: boolean; exams: any[] }
  >();
  for (const exam of order.exams ?? []) {
    const cla = exam.classification;
    const key = cla?.cla_id ?? UNCLASSIFIED;
    if (!groups.has(key))
      groups.set(key, {
        order: cla ? (cla.cla_order ?? 0) : Number.MAX_SAFE_INTEGER,
        name: cla ? text(cla.cla_name) : UNCLASSIFIED,
        showImages: Boolean(cla?.cla_show_images),
        exams: [],
      });
    groups.get(key).exams.push(exam);
  }

  const clasificaciones = [...groups.values()]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((group): ReportClassification => {
      const examenes = group.exams.map((exam): ReportExam => {
        const parameters = buildParameters(exam.parameters);
        const observaciones = [
          ...new Set(
            (exam.parameters ?? [])
              .map((p: any) => text(p.observation))
              .filter(Boolean),
          ),
        ] as string[];
        return {
          nombre: text(exam.exa_name),
          parametros: parameters,
          observaciones,
          firmante: buildSigner(exam.signer, images),
          mostrar_firma: true,
        };
      });
      // la firma va después del último examen seguido del mismo firmante
      group.exams.forEach((exam, index) => {
        const next = group.exams[index + 1];
        examenes[index].mostrar_firma =
          !next ||
          (next.signer?.use_id ?? null) !== (exam.signer?.use_id ?? null);
      });
      return {
        nombre: group.name,
        mostrar_imagenes: group.showImages,
        imagenes: group.showImages ? images.attachments : [],
        examenes,
      };
    });

  return {
    laboratorio: {
      nombre: text(lab.lab_name),
      nit: lab.lab_dv
        ? `${text(lab.lab_nit)}-${text(lab.lab_dv)}`
        : text(lab.lab_nit),
      direccion: text(lab.lab_address),
      telefono: text(lab.lab_phone),
      correo: text(lab.lab_email),
      representante: text(lab.lab_legal_representative),
      logo: images.logo,
      firma: images.labSignature,
    },
    paciente: {
      nombre: joinName(
        customer.cus_first_name,
        customer.cus_second_name,
        customer.cus_first_lastname,
        customer.cus_second_lastname,
      ),
      tipo_documento: text(customer.cus_document_type),
      documento: text(customer.cus_document_number),
      fecha_nacimiento: formatBirthdate(customer.cus_birthdate),
      edad: formatAge(customer.cus_birthdate, now),
      genero: text(customer.cus_gender),
      telefono: text(customer.cus_phone),
      correo: text(customer.cus_email),
    },
    orden: {
      codigo: text(order.ord_code),
      fecha_ingreso: formatDateTime(order.ord_created_at),
      fecha_generacion: formatDateTime(now),
    },
    clasificaciones,
    imagenes: images.attachments,
  };
}
