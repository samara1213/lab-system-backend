import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MenuAccessGuard } from './menu-access.guard';

/**
 * Construye un contexto de ejecucion con el usuario y los menus exigidos
 */
const buildContext = (user: any): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('MenuAccessGuard', () => {
  const reflector = new Reflector();
  const guard = new MenuAccessGuard(reflector);
  const userWithMenus = (...urls: string[]) => ({
    role: { menus: urls.map((men_url) => ({ men_url })) },
  });

  afterEach(() => jest.restoreAllMocks());

  it('permite el acceso si el endpoint no exige menús', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(buildContext(userWithMenus()))).toBe(true);
  });

  it('permite el acceso si el rol tiene alguna de las opciones exigidas', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['/roles', '/users']);
    expect(
      guard.canActivate(buildContext(userWithMenus('/dashboard', '/users'))),
    ).toBe(true);
  });

  it('compara las urls sin importar mayúsculas ni barras', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['/users']);
    expect(guard.canActivate(buildContext(userWithMenus(' Users/ ')))).toBe(
      true,
    );
  });

  it('responde 403 si el rol no tiene la opción de menú', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['/users']);
    expect(() =>
      guard.canActivate(buildContext(userWithMenus('/orders/create'))),
    ).toThrow(ForbiddenException);
  });

  it('responde 403 si el usuario no tiene rol', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['/users']);
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
