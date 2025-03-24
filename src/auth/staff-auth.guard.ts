// import { ExecutionContext, Injectable } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { AuthGuard } from '@nestjs/passport';
// import { StaffJwtStrategy } from './staff-jwt.strategy';

// @Injectable()
// export class StaffJwtAuthGuard extends AuthGuard([StaffJwtStrategy.id]) {
//   constructor(private readonly reflector: Reflector) {
//     super();
//   }

//   canActivate(context: ExecutionContext) {
//     const isStaffRoute = this.reflector.get<boolean>(
//       'isStaffRoute',
//       context.getHandler(),
//     );
//     const isPublic = this.reflector.get<boolean>(
//       'isPublic',
//       context.getHandler(),
//     );
//     const disableGlobalAuth = this.reflector.getAllAndOverride<boolean>(
//       'disableGlobalAuth',
//       [context.getHandler(), context.getClass()],
//     );

//     if (isPublic || disableGlobalAuth) {
//       return true;
//     }

//     // Only activate staff authentication for routes marked with @StaffAuth()
//     if (!isStaffRoute) {
//       return true;
//     }

//     return super.canActivate(context);
//   }
// }

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class StaffJwtAuthGuard extends AuthGuard('staff-jwt') {
  handleRequest(err, user, info) {
    console.log('StaffJwtAuthGuard execution:', { error: err, user, info });

    // If there is an error or no user, throw an exception
    if (err || !user) {
      throw err || new UnauthorizedException('Staff authentication failed');
    }

    // Ensure the user is an admin
    if (!user.isAdmin) {
      console.log('User is not an admin:', user);
      throw new UnauthorizedException('Admin access required');
    }

    return user;
  }
}
