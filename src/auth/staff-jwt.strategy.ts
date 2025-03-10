import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StaffUserService } from 'src/user/services/staff-service-user.service';
import { ConfigService } from '@nestjs/config';

const strategyId = 'jwt.staff';

@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, strategyId) {
  static readonly id = strategyId;
  constructor(
    private readonly staffUserService: StaffUserService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwtStaff.secret'),
    });
  }

  async validate(payload: {
    userId: string;
    email: string;
    iat: number;
    exp: number;
  }) {
    const id = payload.userId;
    const user = await this.staffUserService.findById(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    if (
      user.lastPasswordChange &&
      user.lastPasswordChange.getTime() > payload.iat * 1000
    ) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
