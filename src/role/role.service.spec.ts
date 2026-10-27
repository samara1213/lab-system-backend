import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { userWith } from '../permissions/permissions.test-helpers';

const MODULES = [
  {
    mod_slug: 'orders',
    mod_name: 'Órdenes',
    mod_global: false,
    mod_actions: ['view', 'create', 'update', 'delete'],
  },
  {
    mod_slug: 'results',
    mod_name: 'Resultados',
    mod_global: false,
    mod_actions: ['view', 'create', 'update'],
  },
  {
    mod_slug: 'menus',
    mod_name: 'Menús',
    mod_global: true,
    mod_actions: ['view', 'create', 'update', 'delete'],
  },
];

const permission = (
  slug: string,
  view = true,
  create = false,
  update = false,
  del = false,
) => ({
  module: { mod_slug: slug },
  rpe_can_view: view,
  rpe_can_create: create,
  rpe_can_update: update,
  rpe_can_delete: del,
});

describe('RoleService', () => {
  let service: RoleService;
  const saved: unknown[] = [];
  const roleRepo = {
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const moduleRepo = { find: jest.fn().mockResolvedValue(MODULES) };
  const userRepo = { exists: jest.fn() };
  const manager = {
    getRepository: () => ({
      create: (data: object) => data,
      save: jest.fn(async (data: unknown) => {
        saved.push(data);
        return { rol_id: 'nuevo', ...(data as object) };
      }),
      update: jest.fn(),
      delete: jest.fn(),
    }),
  };
  const dataSource = {
    transaction: jest.fn((work: (m: typeof manager) => unknown) =>
      work(manager),
    ),
  };
  // propaga las excepciones como lo hace ExceptionService con las HttpException
  const exceptionService = {
    handleDBError: jest.fn((error: unknown) => {
      throw error;
    }),
  };

  // administrador de laboratorio: ordenes completas y resultados solo ver
  const labAdmin = userWith({
    orders: { view: true, create: true, update: true, delete: true },
    results: { view: true },
    roles: { view: true, create: true, update: true },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    saved.length = 0;
    service = new RoleService(
      roleRepo as never,
      moduleRepo as never,
      userRepo as never,
      dataSource as never,
      exceptionService as never,
    );
  });

  describe('create', () => {
    it('crea el rol en el laboratorio del administrador con los permisos indicados', async () => {
      const result = await service.create(
        {
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
        },
        labAdmin,
      );
      expect(result.status).toBe(201);
      expect(saved[0]).toMatchObject({
        rol_nombre: 'Auxiliar',
        laboratory: { lab_id: 'lab-a' },
      });
      expect(saved[1]).toEqual([
        expect.objectContaining({
          module: { mod_slug: 'orders' },
          rpe_can_view: true,
          rpe_can_create: true,
          rpe_can_update: false,
        }),
      ]);
    });

    it('no concede permisos que el administrador no tiene', async () => {
      await expect(
        service.create(
          {
            rol_nombre: 'X',
            permissions: [
              {
                module: 'results',
                view: true,
                create: true,
                update: false,
                delete: false,
              },
            ],
          },
          labAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no da permisos de módulos globales a quien no es super administrador', async () => {
      await expect(
        service.create(
          {
            rol_nombre: 'X',
            permissions: [
              {
                module: 'menus',
                view: true,
                create: false,
                update: false,
                delete: false,
              },
            ],
          },
          labAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('exige "ver" para crear, editar o eliminar', async () => {
      await expect(
        service.create(
          {
            rol_nombre: 'X',
            permissions: [
              {
                module: 'orders',
                view: false,
                create: true,
                update: false,
                delete: false,
              },
            ],
          },
          labAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ignora acciones que no aplican al módulo (resultados no se eliminan)', async () => {
      const system = userWith({}, { system: true });
      await service.create(
        {
          rol_nombre: 'X',
          permissions: [
            {
              module: 'results',
              view: true,
              create: false,
              update: false,
              delete: true,
            },
          ],
        },
        system,
      );
      expect(saved[1]).toEqual([
        expect.objectContaining({ rpe_can_view: true, rpe_can_delete: false }),
      ]);
    });

    it('el super administrador sin laboratorio crea un rol global', async () => {
      await service.create(
        { rol_nombre: 'Global', permissions: [] },
        userWith({}, { system: true }),
      );
      expect(saved[0]).toMatchObject({
        rol_nombre: 'Global',
        laboratory: null,
      });
    });

    it('un administrador no puede crear roles en otro laboratorio', async () => {
      await expect(
        service.create(
          { rol_nombre: 'X', laboratory: 'lab-b', permissions: [] },
          labAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertAssignable', () => {
    it('permite asignar un rol con permisos iguales o menores', async () => {
      roleRepo.findOne.mockResolvedValue({
        rol_id: 'r',
        rol_active: true,
        rol_is_system: false,
        laboratory: null,
        permissions: [permission('orders', true, true)],
      });
      await expect(
        service.assertAssignable('r', labAdmin, 'lab-a'),
      ).resolves.toBeUndefined();
    });

    it('rechaza un rol con más permisos que el del administrador', async () => {
      roleRepo.findOne.mockResolvedValue({
        rol_id: 'r',
        rol_active: true,
        rol_is_system: false,
        laboratory: null,
        permissions: [permission('results', true, true)],
      });
      await expect(
        service.assertAssignable('r', labAdmin, 'lab-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza roles del sistema, inactivos o de otro laboratorio', async () => {
      roleRepo.findOne.mockResolvedValue({
        rol_id: 'r',
        rol_active: true,
        rol_is_system: true,
        laboratory: null,
        permissions: [],
      });
      await expect(
        service.assertAssignable('r', labAdmin, 'lab-a'),
      ).rejects.toThrow(ForbiddenException);
      roleRepo.findOne.mockResolvedValue({
        rol_id: 'r',
        rol_active: false,
        rol_is_system: false,
        laboratory: null,
        permissions: [],
      });
      await expect(
        service.assertAssignable('r', labAdmin, 'lab-a'),
      ).rejects.toThrow(ForbiddenException);
      roleRepo.findOne.mockResolvedValue({
        rol_id: 'r',
        rol_active: true,
        rol_is_system: false,
        laboratory: { lab_id: 'lab-b' },
        permissions: [],
      });
      await expect(
        service.assertAssignable('r', labAdmin, 'lab-a'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update y remove', () => {
    const labRole = {
      rol_id: 'r',
      rol_active: true,
      rol_is_system: false,
      laboratory: { lab_id: 'lab-a' },
      permissions: [],
    };

    it('no edita roles del sistema, globales (si no es super administrador) ni el propio', async () => {
      roleRepo.findOne.mockResolvedValue({ ...labRole, laboratory: null });
      await expect(
        service.update('r', { rol_nombre: 'X' }, labAdmin),
      ).rejects.toThrow(ForbiddenException);
      roleRepo.findOne.mockResolvedValue({ ...labRole, rol_id: 'role-actor' });
      await expect(
        service.update('role-actor', { rol_nombre: 'X' }, labAdmin),
      ).rejects.toThrow(ForbiddenException);
      roleRepo.findOne.mockResolvedValue({ ...labRole, rol_is_system: true });
      await expect(
        service.update(
          'r',
          { rol_nombre: 'X' },
          userWith({}, { system: true }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('un rol de otro laboratorio responde 404', async () => {
      roleRepo.findOne.mockResolvedValue({
        ...labRole,
        laboratory: { lab_id: 'lab-b' },
      });
      await expect(
        service.update('r', { rol_nombre: 'X' }, labAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('no elimina un rol con usuarios', async () => {
      roleRepo.findOne.mockResolvedValue(labRole);
      userRepo.exists.mockResolvedValue(true);
      await expect(service.remove('r', labAdmin)).rejects.toThrow(
        ConflictException,
      );
      userRepo.exists.mockResolvedValue(false);
      await expect(service.remove('r', labAdmin)).resolves.toMatchObject({
        status: 200,
      });
      expect(roleRepo.delete).toHaveBeenCalledWith({ rol_id: 'r' });
    });
  });
});
