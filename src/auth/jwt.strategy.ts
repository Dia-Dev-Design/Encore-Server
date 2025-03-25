import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/user/services/user.service';
import { ConfigService } from '@nestjs/config';

const strategyId = 'jwt.standard';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, strategyId) {
  static readonly id = strategyId;
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      configService: ConfigService,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: {
    userId: string;
    email: string;
    isAdmin: boolean;
    accessToken: string;
    iat: number;
    exp: number;
  }) {
    const id = payload.userId;
    const user = await this.userService.findById(id);

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
