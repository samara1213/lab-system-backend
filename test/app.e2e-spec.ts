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
    uploadFile: jest.fn().mockResolvedValue('ruta/ficticia'),
    getSignedUrl: jest.fn(),
    getPrivateImageBuffer: jest.fn(),
  };
  const emails = { sendMailWelcome: jest.fn(), sendMailResults: jest.fn() };

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

    for (const correo of [
      'admin-a@ejemplo.test',
      'recep-a@ejemplo.test',
      'recep-b@ejemplo.test',
    ]) {
      const res = await http
        .post('/api/auth/login')
        .send({ use_correo: correo, use_contrasena: TEST_PASSWORD });
      tokens[correo.split('@')[0]] = res.body.token;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const as = (user: 'admin-a' | 'recep-a' | 'recep-b') => ({
    Authorization: `Bearer ${tokens[user]}`,
  });

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
    it('inicia sesión con los 3 usuarios', () => {
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

  describe('administración global por opción de menú', () => {
    it.each([
      ['GET', '/api/laboratory'],
      ['GET', '/api/role'],
      ['GET', '/api/menu'],
    ])(
      '%s %s: 403 sin la opción de menú y 200 con ella',
      async (_method, url) => {
        await http.get(url).set(as('recep-a')).expect(403);
        await http.get(url).set(as('admin-a')).expect(200);
      },
    );

    it('usuarios: 403 sin menú; el administrador ve usuarios de otro laboratorio', async () => {
      await http
        .get(`/api/auth/${data.A.lab_id}`)
        .set(as('recep-a'))
        .expect(403);
      await http
        .get(`/api/auth/${data.B.lab_id}`)
        .set(as('admin-a'))
        .expect(200);
    });

    it('sin menú no registra usuarios, no cambia roles ni crea menús', async () => {
      await http
        .post('/api/auth/register')
        .set(as('recep-a'))
        .send({ use_correo: 'x@ejemplo.test' })
        .expect(403);
      await http
        .patch(`/api/auth/${data.users['recep-a@ejemplo.test']}`)
        .set(as('recep-a'))
        .send({ role: data.roles.admin })
        .expect(403);
      await http
        .post('/api/menu')
        .set(as('recep-a'))
        .send({ men_name: 'X' })
        .expect(403);
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
