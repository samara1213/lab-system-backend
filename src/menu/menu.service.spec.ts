import { BadRequestException, ConflictException } from '@nestjs/common';
import { MenuService } from './menu.service';

// arbol: grupo (1) > hijo (2) > nieto (3); otro grupo (1)
const rows = [
  {
    men_id: 'grupo',
    men_name: 'Grupo',
    men_level: 1,
    men_url: null,
    men_parent: null,
    module: null,
  },
  {
    men_id: 'hijo',
    men_name: 'Hijo',
    men_level: 2,
    men_url: null,
    men_parent: { men_id: 'grupo' },
    module: null,
  },
  {
    men_id: 'nieto',
    men_name: 'Nieto',
    men_level: 3,
    men_url: '/x',
    men_parent: { men_id: 'hijo' },
    module: { mod_slug: 'orders' },
  },
  {
    men_id: 'otro',
    men_name: 'Otro',
    men_level: 1,
    men_url: null,
    men_parent: null,
    module: null,
  },
];

describe('MenuService', () => {
  let service: MenuService;
  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ max: 2 }),
  };
  const menuRepo = {
    findOne: jest.fn(({ where }) =>
      Promise.resolve(rows.find((row) => row.men_id === where.men_id) ?? null),
    ),
    find: jest.fn().mockResolvedValue(rows),
    create: jest.fn((data) => data),
    save: jest.fn(),
    exists: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const repoInTransaction = { update: jest.fn() };
  const dataSource = {
    transaction: jest.fn((work) =>
      work({ getRepository: () => repoInTransaction }),
    ),
  };
  const exceptionService = {
    handleDBError: jest.fn((error: unknown) => {
      throw error;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MenuService(
      menuRepo as never,
      dataSource as never,
      exceptionService as never,
    );
  });

  it('crea una opción al final de sus hermanas, con el nivel del padre + 1 y la url normalizada', async () => {
    await service.create({
      men_name: 'Nueva',
      men_parent: 'grupo',
      men_url: 'Orders/Search/',
      module: 'orders',
    });
    expect(menuRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        men_name: 'Nueva',
        men_level: 2,
        men_order: 3,
        men_url: '/orders/search',
        men_parent: { men_id: 'grupo' },
        module: { mod_slug: 'orders' },
      }),
    );
  });

  it('no permite un cuarto nivel', async () => {
    await expect(
      service.create({ men_name: 'Cuarto', men_parent: 'nieto' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('una opción con url necesita módulo', async () => {
    await expect(
      service.create({ men_name: 'Sin módulo', men_url: '/x' }),
    ).rejects.toThrow('Indica el módulo');
  });

  it('no permite mover una opción dentro de sí misma ni de sus descendientes', async () => {
    await expect(
      service.update('grupo', { men_parent: 'grupo' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update('grupo', { men_parent: 'nieto' }),
    ).rejects.toThrow('dentro de sí misma');
  });

  it('no permite un movimiento que deje el árbol con más de 3 niveles', async () => {
    // "grupo" tiene dos niveles debajo: dentro de "otro" su nieto quedaría en el nivel 4
    await expect(
      service.update('grupo', { men_parent: 'otro' }),
    ).rejects.toThrow('máximo 3 niveles');
    // "hijo" tiene uno: dentro de "otro" queda en 2 y su hijo en 3 (válido, se recalcula el nivel)
    await expect(
      service.update('hijo', { men_parent: 'otro' }),
    ).resolves.toMatchObject({ status: 200 });
    expect(repoInTransaction.update).toHaveBeenCalledWith(
      { men_id: 'nieto' },
      { men_level: 3 },
    );
  });

  it('no elimina una opción con opciones dentro', async () => {
    menuRepo.exists.mockResolvedValue(true);
    await expect(service.remove('grupo')).rejects.toThrow(ConflictException);
    menuRepo.exists.mockResolvedValue(false);
    await expect(service.remove('otro')).resolves.toMatchObject({
      status: 200,
    });
  });
});
