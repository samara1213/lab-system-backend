import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from '../entities/user.entity';

// mensaje generico para no revelar si un registro existe en otro laboratorio
export const NOT_FOUND_MESSAGE = 'No existe registro con estos datos';

/**
 * Retorna el id del laboratorio del usuario autenticado. Si el cliente envia
 * un laboratorio, valida que sea el mismo del usuario; si no lo es se responde
 * como si el registro no existiera
 * @param user usuario autenticado (request.user)
 * @param requestedLabId laboratorio enviado por el cliente (opcional)
 * @returns id del laboratorio del usuario
 */
export function resolveLaboratoryId(user: User, requestedLabId?: string): string {

    const labId = user?.laboratory?.lab_id;

    // el usuario debe tener un laboratorio asignado para operar datos del laboratorio
    if (!labId) throw new ForbiddenException('El usuario no tiene un laboratorio asignado');

    // el laboratorio enviado por el cliente debe ser el del usuario
    if (requestedLabId && requestedLabId !== labId) throw new NotFoundException(NOT_FOUND_MESSAGE);

    return labId;
}
