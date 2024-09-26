import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from 'src/auth/entities/user.entity';
import { META_ROLES } from 'src/auth/decorators/role-protected.decorator';

@Injectable()
export class UserRoleGuard implements CanActivate {
  
  constructor(
    private readonly reflector: Reflector,
  ){}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    
    const validateRole: string[] = this.reflector.get(META_ROLES, context.getHandler())
console.log(validateRole)
    if(!validateRole) return true;
    if(validateRole.length ===0 ) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user)
        throw new InternalServerErrorException('Usuario no presente el la request')
    
    for (const role of user.use_rol) {
      
      if( validateRole.includes(role)) {
        return true
      }
    }   

    return false;
  }
}
