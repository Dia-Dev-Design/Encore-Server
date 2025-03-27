// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { StaffUserService } from 'src/user/services/staff-service-user.service';
// import { ConfigService } from '@nestjs/config';

// const strategyId = 'jwt.staff';

// @Injectable()
// export class StaffJwtStrategy extends PassportStrategy(Strategy, strategyId) {
//   static readonly id = strategyId;
//   constructor(
//     private readonly staffUserService: StaffUserService,
//     private readonly configService: ConfigService,
//   ) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: configService.get('jwtStaff.secret'),
//     });
//   }

//   async validate(payload: {
//     userId: string;
//     email: string;
//     isAdmin: boolean;
//     iat: number;
//     exp: number;
//   }) {
//     const id = payload.userId;
//     const user = await this.staffUserService.findById(id);

//     if (!user) {
//       throw new UnauthorizedException();
//     }

//     if (
//       user.lastPasswordChange &&
//       user.lastPasswordChange.getTime() > payload.iat * 1000
//     ) {
//       throw new UnauthorizedException();
//     }

//     return user;
//   }
// }

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(private configService: ConfigService) {
    // Debug logging
    console.log('Available config:', {
      jwtStaffSecret: configService.get('jwtStaff.secret'),
    });
    
    const secret = configService.get<string>('jwtStaff.secret');
    if (!secret) {
      throw new Error('JWT staff secret is not defined in environment variables (JWT_STAFF_SECRET)');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    
    console.log('Staff JWT Strategy initialized with secret:', secret.substring(0, 3) + '...');
  }

  async validate(payload: any) {
    console.log('Validating JWT payload:', payload);

    if (!payload.userId && !payload.id) {
      console.error('Missing user ID in payload');
      return null;
    }

    return {
      id: payload.userId || payload.id,
      email: payload.email,
      isAdmin: true,
    };
  }
}
