import { readdirSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { buildDataSourceOptions } from '../src/database/database.config';
import { StorageService } from '../src/storage/storage.service';
import { EmailsService } from '../src/emails/emails.service';
import {
  recreateTestDatabase,
  seedTestData,
  SeedData,
  TEST_PASSWORD,
  TEST_USERS,
  TestUser,
} from './utils/test-database';

/**
 * Carga las clases de migracion con require (jest transforma los .ts)
 */
function loadMigrations() {
  const dir = join(__dirname, '..', 'src', 'database', 'migrations');
  return (
    readdirSync(dir)
      .filter((file) => file.endsWith('.ts'))
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      .flatMap((file) => Object.values(require(join(dir, file))) as any[])
  );
}

describe('API (e2e): aislamiento por laboratorio, permisos y seguridad', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;
  let data: SeedData;
  const tokens: Record<string, string> = {};
  const storage = {
    // devuelve la misma ruta que recibe (como Supabase)
    uploadFile: jest.fn(
      (
        _buffer: Buffer,
        path: string,
        _contentType?: string,
        _upsert?: boolean,
      ) => Promise.resolve(path),
    ),
    getSignedUrl: jest.fn((path: string) =>
      Promise.resolve(`https://storage.ejemplo.test/${path}?firmado`),
    ),
    getPrivateImageBuffer: jest.fn(),
    deleteFile: jest.fn(),
  };
  const emails = {
    sendMailWelcome: jest.fn(),
    sendMailResults: jest.fn(),
    sendMailPasswordReset: jest.fn(),
    sendMailTemporaryPassword: jest.fn(),
  };

  beforeAll(async () => {
    // base vacía y esquema creado SOLO con las migraciones
    await recreateTestDatabase();
    const migrationsDs = new DataSource({
      ...buildDataSourceOptions(),
      migrations: loadMigrations(),
    });
    await migrationsDs.initialize();
    await migrationsDs.runMigrations();
    await migrationsDs.destroy();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(storage)
      .overrideProvider(EmailsService)
      .useValue(emails)
      .compile();
    app = configureApp(
      moduleRef.createNestApplication<NestExpressApplication>(),
    );
    await app.init();
    http = request(app.getHttpServer());

    data = await seedTestData(app.get(DataSource));

    for (const name of TEST_USERS) {
      const res = await http.post('/api/auth/login').send({
        use_correo: `${name}@ejemplo.test`,
        use_contrasena: TEST_PASSWORD,
      });
      tokens[name] = res.body.token;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const as = (user: TestUser) => ({ Authorization: `Bearer ${tokens[user]}` });

  describe('migraciones', () => {
    it('las entidades coinciden con el esquema creado por las migraciones', async () => {
      const pending = await app
        .get(DataSource)
        .driver.createSchemaBuilder()
        .log();
      expect(pending.upQueries.map((q) => q.query)).toEqual([]);
    });
  });

  describe('autenticación', () => {
    it('inicia sesión con todos los usuarios de prueba', () => {
      expect(Object.keys(tokens)).toHaveLength(TEST_USERS.length);
      expect(Object.values(tokens).every(Boolean)).toBe(true);
    });

    it('sin token responde 401', () =>
      http.get(`/api/orders/${data.A.ord_id}`).expect(401));

    it('cambio de contraseña con la anterior incorrecta responde 400', () =>
      http
        .post('/api/auth/changePassword')
        .send({
          use_correo: 'recep-a@ejemplo.test',
          use_old_contrasena: 'Mala123*',
          use_new_contrasena: 'Nueva123*',
        })
        .expect(400));
  });

  describe('órdenes', () => {
    it('recepción A ve su orden', () =>
      http.get(`/api/orders/${data.A.ord_id}`).set(as('recep-a')).expect(200));
    it('recepción B no ve la orden de A', () =>
      http.get(`/api/orders/${data.A.ord_id}`).set(as('recep-b')).expect(404));
    it('orden inexistente responde 404', () =>
      http
        .get('/api/orders/00000000-0000-4000-8000-000000000000')
        .set(as('recep-a'))
        .expect(404));

    it('listar enviando el laboratorio A desde B responde 404', () =>
      http
        .post('/api/orders/laboratory')
        .set(as('recep-b'))
        .send({ lab_id: data.A.lab_id, ord_status: 'PENDIENTE' })
        .expect(404));

    it('listar sin lab_id trae solo las órdenes del laboratorio del usuario', async () => {
      const res = await http
        .post('/api/orders/laboratory')
        .set(as('recep-b'))
        .send({ ord_status: 'PENDIENTE' })
        .expect(201);
      expect(res.body.data.map((o: any) => o.ord_id)).toEqual([data.B.ord_id]);
    });

    it('los montos llegan como número', async () => {
      const res = await http
        .get(`/api/orders/${data.A.ord_id}`)
        .set(as('recep-a'))
        .expect(200);
      expect(res.body.data.ord_total_value).toBe(10000);
      expect(res.body.data.exams[0].exa_price).toBe(10000);
    });

    it('no cancela ni cambia el estado de una orden de otro laboratorio', async () => {
      await http
        .delete(`/api/orders/${data.A.ord_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .patch('/api/orders/change/status')
        .set(as('recep-b'))
        .send({ ord_id: data.A.ord_id, ord_status: 'CANCELADA' })
        .expect(404);
      const res = await http
        .get(`/api/orders/${data.A.ord_id}`)
        .set(as('recep-a'));
      expect(res.body.data.ord_status).toBe('PENDIENTE');
    });

    it('cambiar estado sin ord_id responde 404 y con ord_id inválido 400', async () => {
      await http
        .patch('/api/orders/change/status')
        .set(as('recep-a'))
        .send({ ord_status: 'X' })
        .expect(404);
      await http
        .patch('/api/orders/change/status')
        .set(as('recep-a'))
        .send({ ord_id: 'abc', ord_status: 'X' })
        .expect(400);
    });

    it('cambiar el estado de una orden propia actualiza ord_updated_at', async () => {
      const before = (
        await http.get(`/api/orders/${data.A.ord_id}`).set(as('recep-a'))
      ).body.data.ord_updated_at;
      await http
        .patch('/api/orders/change/status')
        .set(as('recep-a'))
        .send({ ord_id: data.A.ord_id, ord_status: 'PROCESANDO' })
        .expect(200);
      const after = (
        await http.get(`/api/orders/${data.A.ord_id}`).set(as('recep-a'))
      ).body.data;
      expect(after.ord_status).toBe('PROCESANDO');
      expect(new Date(after.ord_updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime(),
      );
      await http
        .patch('/api/orders/change/status')
        .set(as('recep-a'))
        .send({ ord_id: data.A.ord_id, ord_status: 'PENDIENTE' })
        .expect(200);
    });

    it('no accede a resultados, correo ni PDF de una orden de otro laboratorio', async () => {
      await http
        .get(`/api/orders/results/${data.A.ord_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .get(`/api/orders/emails/${data.A.ord_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .get(`/api/orders/urlprefirmate/${data.A.ord_id}`)
        .set(as('recep-b'))
        .expect(404);
      expect(emails.sendMailResults).not.toHaveBeenCalled();
    });

    it('no crea órdenes con paciente o exámenes de otro laboratorio', async () => {
      await http
        .post('/api/orders')
        .set(as('recep-b'))
        .send({
          ord_total_value: 1,
          lab_id: data.B.lab_id,
          cus_id: data.A.cus_id,
          exa_ids: [data.B.exa_id],
        })
        .expect(404);
      await http
        .post('/api/orders')
        .set(as('recep-b'))
        .send({
          ord_total_value: 1,
          lab_id: data.B.lab_id,
          cus_id: data.B.cus_id,
          exa_ids: [data.B.exa_id, data.A.exa_id],
        })
        .expect(404);
      await http
        .post('/api/orders')
        .set(as('recep-b'))
        .send({
          ord_total_value: 1,
          lab_id: data.B.lab_id,
          cus_id: data.B.cus_id,
          exa_ids: [data.B.exa_id],
        })
        .expect(201);
    });
  });

  describe('exámenes y parámetros', () => {
    it('no lista, ve ni edita exámenes de otro laboratorio', async () => {
      await http
        .get(`/api/exams/companies/${data.A.lab_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .get(`/api/exams/${data.A.exa_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .patch(`/api/exams/${data.A.exa_id}`)
        .set(as('recep-b'))
        .send({ exa_name: 'X' })
        .expect(404);
      await http
        .get(`/api/exams/${data.A.exa_id}`)
        .set(as('recep-a'))
        .expect(200);
    });

    it('no crea un examen con un convenio de otro laboratorio', () =>
      http
        .post('/api/exams')
        .set(as('recep-b'))
        .send({
          exa_name: 'X',
          exa_price: 1,
          laboratory: data.B.lab_id,
          alliance: data.A.ali_id,
        })
        .expect(404));

    it('los parámetros de un examen ajeno salen vacíos y no se pueden crear ni editar', async () => {
      const res = await http
        .get(`/api/params-exams/exam/${data.A.exa_id}`)
        .set(as('recep-b'))
        .expect(200);
      expect(res.body.data).toEqual([]);
      await http
        .patch(`/api/params-exams/${data.A.par_id}`)
        .set(as('recep-b'))
        .send({ par_name: 'XXX' })
        .expect(404);
      await http
        .post('/api/params-exams')
        .set(as('recep-b'))
        .send({ par_name: 'XXX', par_range: false, exam: data.A.exa_id })
        .expect(404);
    });
  });

  describe('resultados', () => {
    it('solo registra resultados en órdenes y parámetros del propio laboratorio', async () => {
      await http
        .post('/api/results')
        .set(as('recep-b'))
        .send({
          res_value: '1',
          order: data.A.ord_id,
          exam: data.A.exa_id,
          param: data.A.par_id,
        })
        .expect(404);
      await http
        .post('/api/results')
        .set(as('recep-a'))
        .send({
          res_value: '1',
          order: data.A.ord_id,
          exam: data.B.exa_id,
          param: data.B.par_id,
        })
        .expect(404);
      await http
        .post('/api/results')
        .set(as('recep-a'))
        .send({
          res_value: '13.5',
          order: data.A.ord_id,
          exam: data.A.exa_id,
          param: data.A.par_id,
        })
        .expect(201);
    });

    it('no lee ni edita resultados de otro laboratorio', async () => {
      await http
        .get(`/api/results/${data.A.ord_id}`)
        .set(as('recep-b'))
        .expect(404);
      const res = await http
        .get(`/api/results/${data.A.ord_id}`)
        .set(as('recep-a'))
        .expect(200);
      const resId = res.body.data[0].res_id;
      await http
        .patch(`/api/results/${resId}`)
        .set(as('recep-b'))
        .send({ res_value: '99' })
        .expect(404);
      await http
        .patch(`/api/results/${resId}`)
        .set(as('recep-a'))
        .send({ res_value: '14' })
        .expect(200);
    });
  });

  describe('pacientes y convenios', () => {
    it('no lista, busca ni edita pacientes de otro laboratorio', async () => {
      await http
        .get(`/api/customers/companies/${data.A.lab_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .post('/api/customers/searches')
        .set(as('recep-b'))
        .send({ laboratory: data.A.lab_id, cus_document_number: '0000000001' })
        .expect(404);
      await http
        .patch(`/api/customers/${data.A.cus_id}`)
        .set(as('recep-b'))
        .send({ cus_first_name: 'X' })
        .expect(404);
      await http
        .patch(`/api/customers/${data.A.cus_id}`)
        .set(as('recep-a'))
        .send({ cus_first_name: 'Pruebas', laboratory: data.A.lab_id })
        .expect(200);
    });

    it('no lista ni edita convenios de otro laboratorio, ni los mueve', async () => {
      await http
        .get(`/api/alliance/laboratory/${data.A.lab_id}`)
        .set(as('recep-b'))
        .expect(404);
      await http
        .patch(`/api/alliance/${data.A.ali_id}`)
        .set(as('recep-b'))
        .send({ ali_nombre: 'X' })
        .expect(404);
      await http
        .patch(`/api/alliance/${data.A.ali_id}`)
        .set(as('recep-a'))
        .send({ ali_laboratory_id: data.B.lab_id })
        .expect(404);
    });
  });

  describe('adjuntos', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);

    it('no adjunta a una orden de otro laboratorio', () =>
      http
        .post(`/api/attached/upload/${data.A.ord_id}`)
        .set(as('recep-b'))
        .attach('file', png, 'a.png')
        .expect(404));

    it('rechaza HTML disfrazado de PDF', () =>
      http
        .post(`/api/attached/upload/${data.A.ord_id}`)
        .set(as('recep-a'))
        .attach(
          'file',
          Buffer.from('<html><script>alert(1)</script></html>'),
          'x.pdf',
        )
        .expect(400));

    it('rechaza archivos de más de 10 MB', () =>
      http
        .post(`/api/attached/upload/${data.A.ord_id}`)
        .set(as('recep-a'))
        .attach('file', Buffer.alloc(11 * 1024 * 1024), 'grande.pdf')
        .expect(413));

    it('sube un PNG válido con nombre generado y su tipo real', async () => {
      await http
        .post(`/api/attached/upload/${data.A.ord_id}`)
        .set(as('recep-a'))
        .attach('file', png, '../evil.png')
        .expect(201);
      const [, path, contentType] = storage.uploadFile.mock.calls.at(-1);
      expect(path).toMatch(
        new RegExp(`^${data.A.lab_id}/adjuntos/[0-9a-f-]{36}\\.png$`),
      );
      expect(contentType).toBe('image/png');
    });
  });

  describe('sesión y menú (/auth/me)', () => {
    it('devuelve permisos por módulo y solo el menú que el rol puede ver', async () => {
      const res = await http
        .get('/api/auth/me')
        .set(as('consulta-a'))
        .expect(200);
      expect(res.body.data.permissions).toEqual({
        orders: { view: true, create: false, update: false, delete: false },
      });
      expect(res.body.data.role.menus.map((m: any) => m.men_url)).toEqual([
        '/dashboard',
        '/orders/search',
      ]);
      expect(res.body.data).not.toHaveProperty('use_contrasena');
    });

    it('el super administrador ve todos los módulos, incluidos los globales', async () => {
      const res = await http.get('/api/auth/me').set(as('admin-a')).expect(200);
      expect(res.body.data.role.rol_is_system).toBe(true);
      expect(res.body.data.permissions.laboratories.update).toBe(true);
      expect(res.body.data.role.menus.map((m: any) => m.men_url)).toContain(
        '/menus',
      );
    });

    it('el login devuelve la misma sesión y registra el último ingreso', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({
          use_correo: 'consulta-a@ejemplo.test',
          use_contrasena: TEST_PASSWORD,
        })
        .expect(201);
      expect(res.body.data.permissions.orders.view).toBe(true);
      const me = await http.get('/api/auth/me').set(as('consulta-a'));
      expect(me.body.data.use_ultimo_ingreso).toBeTruthy();
    });
  });

  describe('permisos por acción', () => {
    it('solo ver órdenes: lista y ve, pero no crea, no cancela ni registra resultados', async () => {
      await http
        .get(`/api/orders/${data.A.ord_id}`)
        .set(as('consulta-a'))
        .expect(200);
      await http
        .post('/api/orders/laboratory')
        .set(as('consulta-a'))
        .send({ ord_status: 'PENDIENTE' })
        .expect(201);
      await http
        .post('/api/orders')
        .set(as('consulta-a'))
        .send({
          ord_total_value: 1,
          cus_id: data.A.cus_id,
          exa_ids: [data.A.exa_id],
        })
        .expect(403);
      await http
        .delete(`/api/orders/${data.A.ord_id}`)
        .set(as('consulta-a'))
        .expect(403);
      await http
        .post('/api/results')
        .set(as('consulta-a'))
        .send({
          res_value: '1',
          order: data.A.ord_id,
          exam: data.A.exa_id,
          param: data.A.par_id,
        })
        .expect(403);
      await http.get('/api/exams').set(as('consulta-a')).expect(403);
    });

    it('quien crea órdenes lista exámenes, convenios y pacientes aunque no tenga esos módulos', async () => {
      await http
        .post('/api/role')
        .set(as('admin-a'))
        .send({
          rol_nombre: 'SOLO ORDENES',
          permissions: [
            {
              module: 'orders',
              view: true,
              create: true,
              update: false,
              delete: false,
            },
          ],
        })
        .expect(201);
      const role = (
        await http.get('/api/role').set(as('admin-a'))
      ).body.data.find((r: any) => r.rol_nombre === 'SOLO ORDENES');
      await http
        .post('/api/auth/register')
        .set(as('admin-a'))
        .send({
          use_primer_nombre: 'Solo',
          use_primer_apellido: 'Ordenes',
          use_correo: 'ordenes-a@ejemplo.test',
          role: role.rol_id,
        })
        .expect(201);
      const [, , password] = emails.sendMailWelcome.mock.calls.at(-1);
      const login = await http
        .post('/api/auth/login')
        .send({
          use_correo: 'ordenes-a@ejemplo.test',
          use_contrasena: password,
        })
        .expect(201);
      const auth = { Authorization: `Bearer ${login.body.token}` };

      await http.get('/api/exams').set(auth).expect(200);
      await http.get('/api/alliance').set(auth).expect(200);
      await http
        .post('/api/customers/searches')
        .set(auth)
        .send({ cus_document_number: '0000000001' })
        .expect(201);
      await http
        .post('/api/exams')
        .set(auth)
        .send({ exa_name: 'X', exa_price: 1 })
        .expect(403);
      await http
        .patch(`/api/customers/${data.A.cus_id}`)
        .set(auth)
        .send({ cus_first_name: 'X' })
        .expect(403);
    });

    it.each([['/api/laboratory'], ['/api/menu']])(
      'GET %s: módulo global, solo el super administrador',
      async (url) => {
        await http.get(url).set(as('labadmin-a')).expect(403);
        await http.get(url).set(as('admin-a')).expect(200);
      },
    );
  });

  describe('rutas sin laboratorio en la url (Fase 3)', () => {
    it('listan solo los datos del laboratorio de la sesión', async () => {
      const exams = await http.get('/api/exams').set(as('recep-b')).expect(200);
      expect(exams.body.data.map((e: any) => e.exa_id)).toEqual([
        data.B.exa_id,
      ]);
      const alliances = await http
        .get('/api/alliance')
        .set(as('recep-b'))
        .expect(200);
      expect(alliances.body.data.map((a: any) => a.ali_id)).toEqual([
        data.B.ali_id,
      ]);
    });

    it('crear sin enviar el laboratorio lo toma de la sesión', async () => {
      await http
        .post('/api/orders')
        .set(as('recep-b'))
        .send({
          ord_total_value: 1,
          cus_id: data.B.cus_id,
          exa_ids: [data.B.exa_id],
        })
        .expect(201);
      await http
        .post('/api/customers/searches')
        .set(as('recep-b'))
        .send({ cus_document_number: '0000000002' })
        .expect(201);
      await http
        .post('/api/alliance')
        .set(as('recep-b'))
        .send({
          ali_nombre: 'Convenio sin lab',
          ali_direccion: 'Dir',
          ali_telefono: '300',
          ali_nombre_contacto: 'Contacto',
        })
        .expect(201);
      await http
        .post('/api/exams')
        .set(as('recep-b'))
        .send({ exa_name: 'Examen sin lab', exa_price: 1000 })
        .expect(201);
      await http
        .post('/api/customers')
        .set(as('recep-b'))
        .send({
          cus_document_type: 'CC',
          cus_document_number: '0000000099',
          cus_first_lastname: 'Prueba',
          cus_first_name: 'Sin lab',
          cus_address: 'Calle 1',
          cus_gender: 'F',
          cus_birthdate: '1990-01-01',
          cus_phone: '3000000',
          cus_email: 'sinlab@ejemplo.test',
        })
        .expect(201);
      const alliances = await http.get('/api/alliance').set(as('recep-b'));
      expect(alliances.body.data.map((a: any) => a.ali_nombre)).toContain(
        'Convenio sin lab',
      );
    });
  });

  describe('usuarios', () => {
    const nuevo = {
      use_primer_nombre: 'Nuevo',
      use_primer_apellido: 'Usuario',
      use_correo: 'nuevo-a@ejemplo.test',
    };

    it('lista los usuarios del propio laboratorio; solo el super administrador consulta otro', async () => {
      const res = await http
        .get('/api/auth/users')
        .set(as('labadmin-a'))
        .expect(200);
      expect(res.body.data.map((u: any) => u.use_correo)).not.toContain(
        'recep-b@ejemplo.test',
      );
      expect(res.body.data[0]).not.toHaveProperty('use_contrasena');
      await http
        .get(`/api/auth/users?laboratory=${data.B.lab_id}`)
        .set(as('labadmin-a'))
        .expect(404);
      const other = await http
        .get(`/api/auth/users?laboratory=${data.B.lab_id}`)
        .set(as('admin-a'))
        .expect(200);
      expect(other.body.data.map((u: any) => u.use_correo)).toEqual([
        'recep-b@ejemplo.test',
      ]);
      await http.get('/api/auth/users').set(as('recep-a')).expect(403);
    });

    it('el administrador de laboratorio no asigna roles con más permisos que el suyo', async () => {
      // RECEPCION crea resultados; ADMIN LAB solo los ve
      await http
        .post('/api/auth/register')
        .set(as('labadmin-a'))
        .send({ ...nuevo, role: data.roles.recepcion })
        .expect(403);
      await http
        .post('/api/auth/register')
        .set(as('labadmin-a'))
        .send({ ...nuevo, role: data.roles.admin })
        .expect(403);
      await http
        .post('/api/auth/register')
        .set(as('labadmin-a'))
        .send({
          ...nuevo,
          role: data.roles.consulta,
          laboratory: data.B.lab_id,
        })
        .expect(404);
      await http
        .post('/api/auth/register')
        .set(as('labadmin-a'))
        .send({ ...nuevo, role: data.roles.consulta })
        .expect(201);
      expect(emails.sendMailWelcome).toHaveBeenCalledWith(
        'nuevo-a@ejemplo.test',
        'Nuevo Usuario',
        expect.any(String),
      );
    });

    it('nadie cambia su propio rol ni estado; no edita usuarios de otro laboratorio', async () => {
      const self = data.users['labadmin-a@ejemplo.test'];
      await http
        .patch(`/api/auth/${self}`)
        .set(as('labadmin-a'))
        .send({ role: data.roles.consulta })
        .expect(403);
      await http
        .patch(`/api/auth/${self}/status`)
        .set(as('labadmin-a'))
        .send({ use_estado: 'INACTIVO' })
        .expect(403);
      await http
        .patch(`/api/auth/${data.users['recep-b@ejemplo.test']}`)
        .set(as('labadmin-a'))
        .send({ use_primer_nombre: 'X' })
        .expect(404);
      await http
        .patch(`/api/auth/${data.users['admin-a@ejemplo.test']}`)
        .set(as('labadmin-a'))
        .send({ use_primer_nombre: 'X' })
        .expect(403);
    });

    it('un usuario desactivado no puede ingresar ni usar su token', async () => {
      const id = data.users['consulta-a@ejemplo.test'];
      await http
        .patch(`/api/auth/${id}/status`)
        .set(as('labadmin-a'))
        .send({ use_estado: 'INACTIVO' })
        .expect(200);
      await http.get('/api/auth/me').set(as('consulta-a')).expect(401);
      await http
        .post('/api/auth/login')
        .send({
          use_correo: 'consulta-a@ejemplo.test',
          use_contrasena: TEST_PASSWORD,
        })
        .expect(401);
      await http
        .patch(`/api/auth/${id}/status`)
        .set(as('labadmin-a'))
        .send({ use_estado: 'ACTIVO' })
        .expect(200);
      await http.get('/api/auth/me').set(as('consulta-a')).expect(200);
    });

    it('restablecer contraseña envía una temporal y obliga a cambiarla', async () => {
      const id =
        data.users['nuevo-a@ejemplo.test'] ??
        (
          await http.get('/api/auth/users').set(as('labadmin-a'))
        ).body.data.find((u: any) => u.use_correo === nuevo.use_correo).use_id;
      await http
        .post(`/api/auth/${id}/reset-password`)
        .set(as('labadmin-a'))
        .expect(200);
      const [, , password] = emails.sendMailTemporaryPassword.mock.calls.at(-1);
      const login = await http
        .post('/api/auth/login')
        .send({ use_correo: nuevo.use_correo, use_contrasena: password })
        .expect(201);
      expect(login.body.data.use_primer_ingreso).toBe(true);
    });
  });

  describe('roles', () => {
    it('el administrador de laboratorio ve los roles globales y los de su laboratorio, no los del sistema', async () => {
      const res = await http.get('/api/role').set(as('labadmin-a')).expect(200);
      const names = res.body.data.map((r: any) => r.rol_nombre);
      expect(names).toEqual(
        expect.arrayContaining(['ADMIN LAB', 'RECEPCION', 'CONSULTA']),
      );
      expect(names).not.toContain('ADMIN');
      expect(names).not.toContain('Super administrador');
      const recepcion = res.body.data.find(
        (r: any) => r.rol_nombre === 'RECEPCION',
      );
      expect(recepcion).toMatchObject({
        editable: false,
        assignable: false,
        users_count: 2,
      });
    });

    it('el catálogo de módulos no incluye los globales para un administrador de laboratorio', async () => {
      const res = await http
        .get('/api/role/modules')
        .set(as('labadmin-a'))
        .expect(200);
      expect(res.body.data.map((m: any) => m.mod_slug)).not.toContain('menus');
    });

    it('crea, edita y elimina roles de su laboratorio sin escalar permisos', async () => {
      await http
        .post('/api/role')
        .set(as('labadmin-a'))
        .send({
          rol_nombre: 'Escalado',
          permissions: [
            {
              module: 'results',
              view: true,
              create: true,
              update: false,
              delete: false,
            },
          ],
        })
        .expect(403);
      await http
        .post('/api/role')
        .set(as('labadmin-a'))
        .send({
          rol_nombre: 'Auxiliar',
          permissions: [
            {
              module: 'orders',
              view: true,
              create: true,
              update: false,
              delete: false,
            },
          ],
        })
        .expect(201);
      const list = await http.get('/api/role').set(as('labadmin-a'));
      const auxiliar = list.body.data.find(
        (r: any) => r.rol_nombre === 'Auxiliar',
      );
      expect(auxiliar).toMatchObject({
        laboratory: { lab_id: data.A.lab_id },
        editable: true,
        assignable: true,
      });
      await http
        .patch(`/api/role/${auxiliar.rol_id}`)
        .set(as('labadmin-a'))
        .send({
          permissions: [
            {
              module: 'orders',
              view: true,
              create: false,
              update: false,
              delete: false,
            },
          ],
        })
        .expect(200);
      await http
        .patch(`/api/role/${data.roles.recepcion}`)
        .set(as('labadmin-a'))
        .send({ rol_nombre: 'Otro nombre' })
        .expect(403);
      await http
        .patch(`/api/role/${data.roles.labAdmin}`)
        .set(as('labadmin-a'))
        .send({ rol_nombre: 'Otro nombre' })
        .expect(403);
      await http
        .delete(`/api/role/${data.roles.consulta}`)
        .set(as('labadmin-a'))
        .expect(403);
      await http
        .delete(`/api/role/${auxiliar.rol_id}`)
        .set(as('labadmin-a'))
        .expect(200);
    });

    it('el mismo nombre de rol puede existir en dos laboratorios', async () => {
      await http
        .post('/api/role')
        .set(as('admin-a'))
        .send({
          rol_nombre: 'Toma de muestras',
          laboratory: data.A.lab_id,
          permissions: [],
        })
        .expect(201);
      await http
        .post('/api/role')
        .set(as('admin-a'))
        .send({
          rol_nombre: 'Toma de muestras',
          laboratory: data.B.lab_id,
          permissions: [],
        })
        .expect(201);
      await http
        .post('/api/role')
        .set(as('admin-a'))
        .send({
          rol_nombre: 'Toma de muestras',
          laboratory: data.A.lab_id,
          permissions: [],
        })
        .expect(409);
    });

    it('un rol de otro laboratorio responde 404', async () => {
      const list = await http
        .get(`/api/role?laboratory=${data.B.lab_id}`)
        .set(as('admin-a'));
      const rolB = list.body.data.find(
        (r: any) => r.laboratory?.lab_id === data.B.lab_id,
      );
      await http
        .get(`/api/role/${rolB.rol_id}`)
        .set(as('labadmin-a'))
        .expect(404);
    });
  });

  describe('menús (super administrador)', () => {
    it('crea con módulo obligatorio, ordena y no permite más de 3 niveles', async () => {
      await http
        .post('/api/menu')
        .set(as('admin-a'))
        .send({ men_name: 'Sin módulo', men_url: '/x' })
        .expect(400);
      await http
        .post('/api/menu')
        .set(as('admin-a'))
        .send({ men_name: 'Grupo' })
        .expect(201);
      const menus = (await http.get('/api/menu').set(as('admin-a'))).body.data;
      const grupo = menus.find((m: any) => m.men_name === 'Grupo');
      expect(grupo.men_order).toBe(
        menus.filter((m: any) => m.men_level === 1).length,
      );
      await http
        .post('/api/menu')
        .set(as('admin-a'))
        .send({ men_name: 'Nivel 2', men_parent: grupo.men_id })
        .expect(201);
      const nivel2 = (
        await http.get('/api/menu').set(as('admin-a'))
      ).body.data.find((m: any) => m.men_name === 'Nivel 2');
      await http
        .post('/api/menu')
        .set(as('admin-a'))
        .send({
          men_name: 'Nivel 3',
          men_parent: nivel2.men_id,
          men_url: '/n3',
          module: 'orders',
        })
        .expect(201);
      const nivel3 = (
        await http.get('/api/menu').set(as('admin-a'))
      ).body.data.find((m: any) => m.men_name === 'Nivel 3');
      await http
        .post('/api/menu')
        .set(as('admin-a'))
        .send({ men_name: 'Nivel 4', men_parent: nivel3.men_id })
        .expect(400);
      await http
        .patch(`/api/menu/${grupo.men_id}`)
        .set(as('admin-a'))
        .send({ men_parent: nivel3.men_id })
        .expect(400);
      await http
        .patch(`/api/menu/${grupo.men_id}/move`)
        .set(as('admin-a'))
        .send({ direction: 'up' })
        .expect(200);
      await http
        .delete(`/api/menu/${grupo.men_id}`)
        .set(as('admin-a'))
        .expect(409);
    });
  });

  describe('recuperación de contraseña', () => {
    it('responde igual exista o no el correo, y solo envía el enlace si existe', async () => {
      const unknown = await http
        .post('/api/auth/forgot-password')
        .send({ use_correo: 'nadie@ejemplo.test' })
        .expect(200);
      expect(emails.sendMailPasswordReset).not.toHaveBeenCalled();
      const known = await http
        .post('/api/auth/forgot-password')
        .send({ use_correo: 'recep-b@ejemplo.test' })
        .expect(200);
      expect(known.body.message).toBe(unknown.body.message);
      expect(emails.sendMailPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('el enlace cambia la contraseña una sola vez; un token inválido responde 400', async () => {
      const [, , link] = emails.sendMailPasswordReset.mock.calls.at(-1);
      const token = new URL(link).searchParams.get('token');
      expect(
        link.startsWith('http://localhost:5173/reset-password?token='),
      ).toBe(true);
      await http
        .post('/api/auth/reset-password')
        .send({ token: 'f'.repeat(64), use_new_contrasena: 'Nueva1234*' })
        .expect(400);
      await http
        .post('/api/auth/reset-password')
        .send({ token, use_new_contrasena: 'corta' })
        .expect(400);
      await http
        .post('/api/auth/reset-password')
        .send({ token, use_new_contrasena: 'Nueva1234*' })
        .expect(200);
      await http
        .post('/api/auth/reset-password')
        .send({ token, use_new_contrasena: 'Otra12345*' })
        .expect(400);
      await http
        .post('/api/auth/login')
        .send({
          use_correo: 'recep-b@ejemplo.test',
          use_contrasena: 'Nueva1234*',
        })
        .expect(201);
    });
  });

  describe('Fase 4: perfil y firma', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);
    const jpg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(64),
    ]);

    it('cada usuario edita su perfil, pero no su rol ni su correo', async () => {
      await http
        .patch('/api/auth/me')
        .set(as('recep-a'))
        .send({ use_cargo: 'Bacterióloga', use_registro_profesional: 'RP-123' })
        .expect(200);
      const me = await http.get('/api/auth/me').set(as('recep-a')).expect(200);
      expect(me.body.data).toMatchObject({
        use_cargo: 'Bacterióloga',
        use_registro_profesional: 'RP-123',
        has_signature: false,
      });
      await http
        .patch('/api/auth/me')
        .set(as('recep-a'))
        .send({ role: data.roles.admin })
        .expect(400);
      await http
        .patch('/api/auth/me')
        .set(as('recep-a'))
        .send({ use_correo: 'otro@ejemplo.test' })
        .expect(400);
    });

    it('sube la firma propia (PNG/JPG hasta 1 MB) en <lab>/firmas y reemplaza la anterior', async () => {
      await http
        .put('/api/auth/me/signature')
        .set(as('recep-a'))
        .attach('file', Buffer.from('<svg onload=alert(1)>'), 'firma.png')
        .expect(400);
      await http
        .put('/api/auth/me/signature')
        .set(as('recep-a'))
        .attach('file', Buffer.alloc(1024 * 1024 + 10), 'firma.png')
        .expect(413);
      // un PDF no es una firma aunque sea un tipo permitido en adjuntos
      await http
        .put('/api/auth/me/signature')
        .set(as('recep-a'))
        .attach(
          'file',
          Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(64)]),
          'firma.png',
        )
        .expect(400);

      await http
        .put('/api/auth/me/signature')
        .set(as('recep-a'))
        .attach('file', png, '../../firma.png')
        .expect(200);
      const [, first, mime, upsert] = storage.uploadFile.mock.calls.at(-1);
      expect(first).toMatch(
        new RegExp(`^${data.A.lab_id}/firmas/[0-9a-f-]{36}\\.png$`),
      );
      expect([mime, upsert]).toEqual(['image/png', false]);

      await http
        .put('/api/auth/me/signature')
        .set(as('recep-a'))
        .attach('file', jpg, 'firma.jpg')
        .expect(200);
      expect(storage.uploadFile.mock.calls.at(-1)[1]).toMatch(/\.jpg$/);
      expect(storage.deleteFile).toHaveBeenCalledWith(first);

      const me = await http.get('/api/auth/me').set(as('recep-a'));
      expect(me.body.data.has_signature).toBe(true);
      expect(JSON.stringify(me.body)).not.toContain('firmas/');
      const url = await http
        .get('/api/auth/me/signature')
        .set(as('recep-a'))
        .expect(200);
      expect(url.body.data.url).toContain('?firmado');
    });

    it('el administrador carga firmas solo de usuarios de su laboratorio', async () => {
      await http
        .put(`/api/auth/${data.users['consulta-a@ejemplo.test']}/signature`)
        .set(as('labadmin-a'))
        .attach('file', png, 'f.png')
        .expect(200);
      await http
        .put(`/api/auth/${data.users['recep-b@ejemplo.test']}/signature`)
        .set(as('labadmin-a'))
        .attach('file', png, 'f.png')
        .expect(404);
      await http
        .put(`/api/auth/${data.users['consulta-a@ejemplo.test']}/signature`)
        .set(as('recep-a'))
        .attach('file', png, 'f.png')
        .expect(403);
      const users = await http.get('/api/auth/users').set(as('labadmin-a'));
      expect(
        users.body.data.find(
          (u: any) => u.use_correo === 'consulta-a@ejemplo.test',
        ).has_signature,
      ).toBe(true);
      await http
        .delete(`/api/auth/${data.users['consulta-a@ejemplo.test']}/signature`)
        .set(as('labadmin-a'))
        .expect(200);
    });
  });

  describe('Fase 4: resultados en lote y firmante por examen', () => {
    let ordId: string;
    const batch = (value: string, extra: object = {}) => ({
      order: ordId,
      results: [
        {
          exam: data.A.exa_id,
          param: data.A.par_id,
          res_value: value,
          res_observation: 'Muestra hemolizada',
          ...extra,
        },
      ],
    });

    beforeAll(async () => {
      // orden nueva y limpia en el laboratorio A
      await http
        .post('/api/orders')
        .set(as('recep-a'))
        .send({
          ord_total_value: 1,
          cus_id: data.A.cus_id,
          exa_ids: [data.A.exa_id],
        })
        .expect(201);
      const list = await http
        .post('/api/orders/laboratory')
        .set(as('recep-a'))
        .send({ ord_status: 'PENDIENTE' });
      ordId = list.body.data.find(
        (o: any) => o.ord_id !== data.A.ord_id,
      ).ord_id;
    });

    it('crea, no repite lo que no cambia y actualiza lo que cambia, en una transacción', async () => {
      const created = await http
        .post('/api/results/batch')
        .set(as('recep-a'))
        .send(batch('12.5'))
        .expect(201);
      expect(created.body.data).toEqual({
        created: 1,
        updated: 0,
        unchanged: 0,
      });
      expect(created.body.warning).toBeUndefined(); // recep-a ya tiene firma

      const same = await http
        .post('/api/results/batch')
        .set(as('recep-a'))
        .send(batch('12.5'))
        .expect(201);
      expect(same.body.data).toEqual({ created: 0, updated: 0, unchanged: 1 });

      const order = await http.get(`/api/orders/${ordId}`).set(as('recep-a'));
      expect(order.body.data.ord_status).toBe('PENDIENTE PDF');
    });

    it('cada examen indica quién lo firma (último en modificar), sin exponer la ruta de la firma', async () => {
      const res = await http
        .get(`/api/orders/results/${ordId}`)
        .set(as('recep-a'))
        .expect(200);
      const exam = res.body.data.exams[0];
      expect(exam.signer).toMatchObject({
        nombre: 'recep-a Prueba',
        cargo: 'Bacterióloga',
        registro: 'RP-123',
        has_signature: true,
      });
      expect(exam.signer).not.toHaveProperty('firma_path');
      expect(exam.parameters[0].result).toBe('12.5');
    });

    it('quien corrige pasa a ser el firmante; sin firma recibe una advertencia', async () => {
      // el super administrador corrige el valor (no tiene firma cargada)
      const fixed = await http
        .post('/api/results/batch')
        .set(as('admin-a'))
        .send(batch('13'))
        .expect(201);
      expect(fixed.body.data.updated).toBe(1);
      expect(fixed.body.warning).toMatch(/firma/);
      const res = await http
        .get(`/api/orders/results/${ordId}`)
        .set(as('recep-a'));
      expect(res.body.data.exams[0].signer.nombre).toBe('admin-a Prueba');
    });

    it('valida la orden, los parámetros y los permisos', async () => {
      await http
        .post('/api/results/batch')
        .set(as('recep-b'))
        .send(batch('1'))
        .expect(404);
      await http
        .post('/api/results/batch')
        .set(as('recep-a'))
        .send({
          order: ordId,
          results: [
            { exam: data.B.exa_id, param: data.B.par_id, res_value: '1' },
          ],
        })
        .expect(404);
      await http
        .post('/api/results/batch')
        .set(as('recep-a'))
        .send({
          order: ordId,
          results: [
            { exam: data.A.exa_id, param: data.A.par_id, res_value: '1' },
            { exam: data.A.exa_id, param: data.A.par_id, res_value: '2' },
          ],
        })
        .expect(400);
      await http
        .post('/api/results/batch')
        .set(as('consulta-a'))
        .send(batch('1'))
        .expect(403);
      await http
        .post('/api/results/batch')
        .set(as('labadmin-a'))
        .send(batch('1'))
        .expect(403);
    });

    it('registrar exige "crear" y corregir exige "editar"', async () => {
      await http
        .post('/api/role')
        .set(as('admin-a'))
        .send({
          rol_nombre: 'SOLO REGISTRA',
          permissions: [
            {
              module: 'results',
              view: true,
              create: true,
              update: false,
              delete: false,
            },
          ],
        })
        .expect(201);
      const role = (
        await http.get('/api/role').set(as('admin-a'))
      ).body.data.find((r: any) => r.rol_nombre === 'SOLO REGISTRA');
      // el rol se relee en cada petición: basta reasignarlo (sin otro login, que tiene límite por minuto)
      const consulta = data.users['consulta-a@ejemplo.test'];
      await http
        .patch(`/api/auth/${consulta}`)
        .set(as('admin-a'))
        .send({ role: role.rol_id })
        .expect(200);
      try {
        // existe: sería una corrección
        await http
          .post('/api/results/batch')
          .set(as('consulta-a'))
          .send(batch('99'))
          .expect(403);
        // sin cambios no exige nada
        await http
          .post('/api/results/batch')
          .set(as('consulta-a'))
          .send(batch('13'))
          .expect(201);
      } finally {
        await http
          .patch(`/api/auth/${consulta}`)
          .set(as('admin-a'))
          .send({ role: data.roles.consulta })
          .expect(200);
      }
    });
  });

  describe('cabeceras HTTP y CORS', () => {
    it('envía cabeceras de helmet y CORS solo para el frontend', async () => {
      const ok = await http
        .get(`/api/orders/${data.A.ord_id}`)
        .set(as('recep-a'))
        .set('Origin', 'http://localhost:5173');
      expect(ok.headers['x-content-type-options']).toBe('nosniff');
      expect(ok.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      const evil = await http
        .get(`/api/orders/${data.A.ord_id}`)
        .set(as('recep-a'))
        .set('Origin', 'https://sitio-malicioso.test');
      expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('límite de intentos (al final: bloquea la IP un minuto)', () => {
    it('responde 429 al superar 10 intentos de login por minuto', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await http.post('/api/auth/login').send({
          use_correo: 'recep-a@ejemplo.test',
          use_contrasena: 'Incorrecta1*',
        });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    });
  });
});
