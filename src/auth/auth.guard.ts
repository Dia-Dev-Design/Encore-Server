import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Injectable()
export class JwtAuthGuard extends AuthGuard([JwtStrategy.id]) {
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

    if (isPublic || disableGlobalAuth || isStaffRoute) {
      return true;
    }

    return super.canActivate(context);
  }
}
