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
  roles: { admin: string; recepcion: string };
  users: Record<string, string>;
}

/**
 * Siembra dos laboratorios con un rol administrador (todas las opciones de
 * menú) y uno de recepción, y un paciente, convenio, examen, parámetro y orden
 * en cada laboratorio. Todos los datos son ficticios
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
    ['Dashboard', '/dashboard'],
    ['Usuarios', '/users'],
    ['Roles', '/roles'],
    ['Menús', '/menus'],
    ['Laboratorios', '/laboratories'],
    ['Buscar órdenes', '/orders/search'],
  ];
  const menus = await repo('Menu').save(
    menuDefs.map(([men_name, men_url]) => ({
      men_name,
      men_url,
      men_level: 1,
      men_icon: 'mdi:circle',
    })),
  );
  const byUrl = Object.fromEntries(menus.map((m: any) => [m.men_url, m]));

  const [admin, recepcion] = await repo('Role').save([
    { rol_nombre: 'ADMIN', menus },
    {
      rol_nombre: 'RECEPCION',
      menus: [byUrl['/dashboard'], byUrl['/orders/search']],
    },
  ]);

  const users = await repo('User').save([
    {
      use_primer_nombre: 'Admin',
      use_primer_apellido: 'A',
      use_correo: 'admin-a@ejemplo.test',
      use_contrasena: hash,
      use_primer_ingreso: false,
      laboratory: labA,
      role: admin,
    },
    {
      use_primer_nombre: 'Recep',
      use_primer_apellido: 'A',
      use_correo: 'recep-a@ejemplo.test',
      use_contrasena: hash,
      use_primer_ingreso: false,
      laboratory: labA,
      role: recepcion,
    },
    {
      use_primer_nombre: 'Recep',
      use_primer_apellido: 'B',
      use_correo: 'recep-b@ejemplo.test',
      use_contrasena: hash,
      use_primer_ingreso: false,
      laboratory: labB,
      role: recepcion,
    },
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
  data.roles = { admin: admin.rol_id, recepcion: recepcion.rol_id };

  return data as SeedData;
}
