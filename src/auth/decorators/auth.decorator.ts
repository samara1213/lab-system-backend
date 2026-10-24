import { UseGuards, applyDecorators } from "@nestjs/common";
import { ValidRole } from "../interfaces/valid-role";
import { AuthGuard } from "@nestjs/passport";
import { UserRoleGuard } from "../guards/user-role/user-role.guard";
import { MenuAccessGuard } from "../guards/menu-access/menu-access.guard";
import { RoleProtected } from "./role-protected.decorator";

/**
 * funcion que se encarga de revisar si un token es valido
 * y, si el endpoint usa @RequireMenu, que el rol tenga la opcion de menu
 * @param roles
 * @returns
 */
export function Auth(...roles: ValidRole[]) {

    return applyDecorators(

        RoleProtected(...roles),
        UseGuards(AuthGuard(), UserRoleGuard, MenuAccessGuard),

    )
}
