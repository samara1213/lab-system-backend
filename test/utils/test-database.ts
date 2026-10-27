import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

export const TEST_PASSWORD = 'Prueba123*';

/**
 * Borra y recrea la base de pruebas (DB_NAME) con su esquema vacío
 */
export async function recreateTestDatabase() {
  const admin = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await admin.connect();
  const dbName = process.env.DB_NAME;
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const db = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
  });
  await db.connect();
  await db.query(`CREATE SCHEMA "${process.env.DB_SCHEMA}"`);
  await db.end();
}

export interface LabData {
  lab_id: string;
  ali_id: string;
  cus_id: string;
  exa_id: string;
  par_id: string;
  ord_id: string;
}

export interface SeedData {
  A: LabData;
  B: LabData;
  roles: {
    admin: string;
    labAdmin: string;
    recepcion: string;
    consulta: string;
  };
  users: Record<string, string>;
}

// usuarios de prueba (correo sin dominio = nombre corto que usan las pruebas)
export const TEST_USERS = [
  'admin-a',
  'labadmin-a',
  'recep-a',
  'recep-b',
  'consulta-a',
] as const;
export type TestUser = (typeof TEST_USERS)[number];

type Flags = string; // 'vcud': ver, crear, editar, eliminar

/**
 * Siembra dos laboratorios con un paciente, convenio, examen, parámetro y orden
 * cada uno, el árbol de menús con sus módulos y estos roles:
 * - ADMIN: rol del sistema (super administrador), usuario en el laboratorio A.
 * - ADMIN LAB: rol del laboratorio A; administra usuarios y roles, resultados solo ver.
 * - RECEPCION: global, todo en órdenes, resultados, pacientes, exámenes y convenios.
 * - CONSULTA: global, solo ver órdenes.
 * Los módulos los crea la migración. Todos los datos son ficticios
 */
export async function seedTestData(dataSource: DataSource): Promise<SeedData> {
  const repo = (name: string) => dataSource.getRepository(name);
  const hash = bcrypt.hashSync(TEST_PASSWORD, 10);

  const [labA, labB] = await repo('Laboratory').save([
    {
      lab_nit: '900000001',
      lab_name: 'Laboratorio A',
      lab_address: 'Calle A',
      lab_phone: '3000000001',
      lab_status: 'ACTIVO',
      lab_email: 'lab-a@ejemplo.test',
      lab_legal_representative: 'Rep A',
    },
    {
      lab_nit: '900000002',
      lab_name: 'Laboratorio B',
      lab_address: 'Calle B',
      lab_phone: '3000000002',
      lab_status: 'ACTIVO',
      lab_email: 'lab-b@ejemplo.test',
      lab_legal_representative: 'Rep B',
    },
  ]);

  const menuDefs = [
    ['Dashboard', '/dashboard', 'orders'],
    ['Buscar órdenes', '/orders/search', 'orders'],
    ['Usuarios', '/users', 'users'],
    ['Roles', '/roles', 'roles'],
    ['Menús', '/menus', 'menus'],
    ['Laboratorios', '/laboratories', 'laboratories'],
  ];
  await repo('Menu').save(
    menuDefs.map(([men_name, men_url, mod], i) => ({
      men_name,
      men_url,
      men_level: 1,
      men_order: i + 1,
      men_icon: 'mdi:circle',
      module: { mod_slug: mod },
    })),
  );

  const role = async (
    rol_nombre: string,
    permissions: Record<string, Flags>,
    extra: object = {},
  ) => {
    const saved = await repo('Role').save({ rol_nombre, ...extra });
    await repo('RolePermission').save(
      Object.entries(permissions).map(([mod, flags]) => ({
        role: { rol_id: saved.rol_id },
        module: { mod_slug: mod },
        rpe_can_view: flags.includes('v'),
        rpe_can_create: flags.includes('c'),
        rpe_can_update: flags.includes('u'),
        rpe_can_delete: flags.includes('d'),
      })),
    );
    return saved;
  };
  const admin = await role('ADMIN', {}, { rol_is_system: true });
  const labAdmin = await role(
    'ADMIN LAB',
    {
      orders: 'vcud',
      results: 'v',
      customers: 'vcu',
      exams: 'vcu',
      alliances: 'vcu',
      users: 'vcu',
      roles: 'vcud',
    },
    { laboratory: labA },
  );
  const recepcion = await role('RECEPCION', {
    orders: 'vcud',
    results: 'vcu',
    customers: 'vcu',
    exams: 'vcu',
    alliances: 'vcu',
  });
  const consulta = await role('CONSULTA', { orders: 'v' });

  const user = (name: string, lab: object, rol: object) => ({
    use_primer_nombre: name,
    use_primer_apellido: 'Prueba',
    use_correo: `${name}@ejemplo.test`,
    use_contrasena: hash,
    use_primer_ingreso: false,
    laboratory: lab,
    role: rol,
  });
  const users = await repo('User').save([
    user('admin-a', labA, admin),
    user('labadmin-a', labA, labAdmin),
    user('recep-a', labA, recepcion),
    user('recep-b', labB, recepcion),
    user('consulta-a', labA, consulta),
  ]);

  const data: Partial<SeedData> = {};
  for (const [key, lab] of [
    ['A', labA],
    ['B', labB],
  ] as const) {
    const alliance = await repo('Alliance').save({
      ali_nombre: `Convenio ${key}`,
      ali_direccion: 'Dir',
      ali_telefono: '3000000000',
      ali_nombre_contacto: 'Contacto',
      laboratory: lab,
    });
    const customer = await repo('Customer').save({
      cus_document_type: 'CC',
      cus_document_number: `000000000${key === 'A' ? 1 : 2}`,
      cus_first_lastname: 'Paciente',
      cus_second_lastname: key,
      cus_first_name: 'Prueba',
      cus_second_name: '',
      cus_address: 'Calle 0',
      cus_gender: 'M',
      cus_birthdate: '1990-01-01',
      cus_phone: '3000000000',
      cus_email: `paciente-${key.toLowerCase()}@ejemplo.test`,
      laboratory: lab,
    });
    const exam = await repo('Exam').save({
      exa_name: `Hemograma ${key}`,
      exa_price: 10000,
      exa_classification: '1',
      laboratory: lab,
    });
    const param = await repo('ParamsExam').save({
      par_name: 'Hemoglobina',
      par_default_value: '',
      par_range: false,
      exam,
    });
    const order = await repo('Order').save({
      ord_total_value: 10000,
      laboratory: lab,
      customer,
      exams: [exam],
    });
    data[key] = {
      lab_id: lab.lab_id,
      ali_id: alliance.ali_id,
      cus_id: customer.cus_id,
      exa_id: exam.exa_id,
      par_id: param.par_id,
      ord_id: order.ord_id,
    };
  }
  data.users = Object.fromEntries(
    users.map((u: any) => [u.use_correo, u.use_id]),
  );
  data.roles = {
    admin: admin.rol_id,
    labAdmin: labAdmin.rol_id,
    recepcion: recepcion.rol_id,
    consulta: consulta.rol_id,
  };

  return data as SeedData;
}
