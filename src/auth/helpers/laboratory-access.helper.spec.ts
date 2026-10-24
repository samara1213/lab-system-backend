import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { resolveLaboratoryId } from './laboratory-access.helper';

describe('resolveLaboratoryId', () => {
  const user = { laboratory: { lab_id: 'lab-a' } } as any;

  it('retorna el laboratorio del usuario si el cliente no envía uno', () => {
    expect(resolveLaboratoryId(user)).toBe('lab-a');
  });

  it('retorna el laboratorio del usuario si el cliente envía el mismo', () => {
    expect(resolveLaboratoryId(user, 'lab-a')).toBe('lab-a');
  });

  it('responde 404 si el cliente envía otro laboratorio', () => {
    expect(() => resolveLaboratoryId(user, 'lab-b')).toThrow(NotFoundException);
  });

  it('responde 403 si el usuario no tiene laboratorio', () => {
    expect(() => resolveLaboratoryId({} as any)).toThrow(ForbiddenException);
  });
});
