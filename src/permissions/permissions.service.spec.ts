import { PermissionsService } from './permissions.service';
import { userWith } from './permissions.test-helpers';

const menu = (
  men_id: string,
  men_name: string,
  men_url: string | null,
  mod: string | null,
  parent: string | null = null,
) => ({
  men_id,
  men_name,
  men_url,
  men_icon: null,
  men_level: parent ? 2 : 1,
  men_order: 0,
  men_parent: parent ? { men_id: parent } : null,
  module: mod ? { mod_slug: mod } : null,
});

type Node = { men_name: string; children: Node[] };
const names = (tree: Node[]): unknown[] =>
  tree.map((node) =>
    node.children.length
      ? { [node.men_name]: names(node.children) }
      : node.men_name,
  );

describe('PermissionsService', () => {
  const menus = [
    menu('inicio', 'Inicio', '/dashboard', 'orders'),
    menu('g-ord', 'Órdenes', null, null),
    menu('crear', 'Crear orden', '/orders/create', 'orders', 'g-ord'),
    menu('g-adm', 'Administración', null, null),
    menu('users', 'Usuarios', '/users', 'users', 'g-adm'),
    menu('menus', 'Menús', '/menus', 'menus', 'g-adm'),
    menu('suelto', 'Sin módulo', '/otra', null),
  ];
  const moduleRepo = {
    find: jest
      .fn()
      .mockResolvedValue([
        { mod_slug: 'orders' },
        { mod_slug: 'users' },
        { mod_slug: 'menus' },
      ]),
  };
  const menuRepo = { find: jest.fn().mockResolvedValue(menus) };
  const service = new PermissionsService(
    moduleRepo as never,
    menuRepo as never,
  );

  it('muestra solo las opciones de los módulos que el rol puede ver y quita los grupos vacíos', async () => {
    const session = await service.buildSession(
      userWith({ orders: { view: true, create: true } }),
    );
    expect(names(session.role.menus as Node[])).toEqual([
      'Inicio',
      { Órdenes: ['Crear orden'] },
    ]);
    expect(session.permissions.orders).toEqual({
      view: true,
      create: true,
      update: false,
      delete: false,
    });
  });

  it('el rol del sistema ve todo, incluidas las opciones sin módulo', async () => {
    const session = await service.buildSession(userWith({}, { system: true }));
    expect(names(session.role.menus as Node[])).toEqual([
      'Inicio',
      { Órdenes: ['Crear orden'] },
      { Administración: ['Usuarios', 'Menús'] },
      'Sin módulo',
    ]);
    expect(Object.keys(session.permissions)).toEqual([
      'orders',
      'users',
      'menus',
    ]);
  });

  it('la sesión no incluye la contraseña', async () => {
    const user = { ...userWith({}), use_contrasena: 'hash' };
    const session = await service.buildSession(user as never);
    expect(session).not.toHaveProperty('use_contrasena');
  });
});
