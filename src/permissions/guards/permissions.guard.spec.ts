import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { userWith } from '../permissions.test-helpers';

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);
  const context = (user: unknown) =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  afterEach(() => jest.restoreAllMocks());

  it('sin @RequirePermission basta la sesión', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(context(userWith()))).toBe(true);
  });

  it('permite con cualquiera de los permisos exigidos', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['exams:view', 'orders:create']);
    expect(
      guard.canActivate(
        context(userWith({ orders: { view: true, create: true } })),
      ),
    ).toBe(true);
  });

  it('responde 403 sin ninguno de los permisos', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['roles:update']);
    expect(() =>
      guard.canActivate(context(userWith({ roles: { view: true } }))),
    ).toThrow(ForbiddenException);
  });

  it('el super administrador pasa siempre', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['menus:delete']);
    expect(guard.canActivate(context(userWith({}, { system: true })))).toBe(
      true,
    );
  });
});
