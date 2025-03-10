import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { StaffJwtStrategy } from './staff-jwt.strategy';

@Injectable()
export class StaffJwtAuthGuard extends AuthGuard([StaffJwtStrategy.id]) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isStaffRoute = this.reflector.get<boolean>(
      'isStaffRoute',
      context.getHandler(),
    );
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    const disableGlobalAuth = this.reflector.getAllAndOverride<boolean>(
      'disableGlobalAuth',
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || disableGlobalAuth) {
      return true;
    }

    // Only activate staff authentication for routes marked with @StaffAuth()
    if (!isStaffRoute) {
      return true;
    }

    return super.canActivate(context);
  }
}
