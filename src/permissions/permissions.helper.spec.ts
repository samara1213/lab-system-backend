import {
  buildPermissionsMap,
  hasPermission,
  isSystemUser,
} from './permissions.helper';
import { userWith } from './permissions.test-helpers';

describe('permissions.helper', () => {
  it('hasPermission: solo las acciones concedidas en el modulo', () => {
    const user = userWith({ orders: { view: true, create: true } });
    expect(hasPermission(user, 'orders:view')).toBe(true);
    expect(hasPermission(user, 'orders:create')).toBe(true);
    expect(hasPermission(user, 'orders:delete')).toBe(false);
    expect(hasPermission(user, 'results:view')).toBe(false);
  });

  it('el rol del sistema tiene todos los permisos', () => {
    const user = userWith({}, { system: true });
    expect(hasPermission(user, 'laboratories:update')).toBe(true);
    expect(isSystemUser(user)).toBe(true);
  });

  it('un rol inactivo no tiene permisos, aunque sea del sistema', () => {
    expect(
      hasPermission(
        userWith({ orders: { view: true } }, { active: false }),
        'orders:view',
      ),
    ).toBe(false);
    expect(
      hasPermission(
        userWith({}, { system: true, active: false }),
        'orders:view',
      ),
    ).toBe(false);
    expect(isSystemUser(userWith({}, { system: true, active: false }))).toBe(
      false,
    );
  });

  it('sin usuario o sin rol no hay permisos', () => {
    expect(hasPermission(undefined, 'orders:view')).toBe(false);
    expect(hasPermission({ role: undefined } as never, 'orders:view')).toBe(
      false,
    );
  });

  it('buildPermissionsMap arma el mapa por modulo; el del sistema recibe todos los modulos', () => {
    expect(
      buildPermissionsMap(
        userWith({ exams: { view: true, update: true } }).role,
      ),
    ).toEqual({
      exams: { view: true, create: false, update: true, delete: false },
    });
    expect(
      buildPermissionsMap(userWith({}, { system: true }).role, [
        'orders',
        'menus',
      ]),
    ).toEqual({
      orders: { view: true, create: true, update: true, delete: true },
      menus: { view: true, create: true, update: true, delete: true },
    });
    expect(
      buildPermissionsMap(
        userWith({ exams: { view: true } }, { active: false }).role,
      ),
    ).toEqual({});
  });
});
