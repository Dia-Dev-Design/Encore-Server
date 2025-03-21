import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/services/user.service';
import { LoginDto } from './dto/login.dto';
import { compareSync, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/email/email.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Config } from 'src/config/config';
import { UserEntity } from 'src/user/entities/user.entity';
import { StaffUserService } from 'src/user/services/staff-service-user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly staffUserService: StaffUserService,
    private readonly configService: ConfigService<Config>,
  ) {}

  async signUp(signUpDto: CreateUserDto) {
    const user = await this.userService.findByEmail(signUpDto.email);
    if (user) {
      throw new BadRequestException('User already exists');
    }

    const newUser = await this.userService.registerUser(signUpDto);

    const token = await this.userService.createVerificationToken(newUser);

    try {
      await this.emailService.sendVerificationEmail(newUser.email, token.token);
    } catch (error) {
      await this.userService.deleteVerificationToken(token.id);
      Logger.error('[VERIFICATION EMAIL] Email not sent', error);
      throw new InternalServerErrorException('Email not sent');
    }

    return {
      accessToken: this.jwtService.sign({
        userId: newUser.id,
        email: newUser.email,
      }),
      user: newUser,
    };
  }

  //TODO auth
  async resetPasswordDefault(userId: string) {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await hash('Testing.123', 10);
    await this.userService.update(userId, {
      password: hashedPassword,
      lastPasswordChange: new Date(),
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!compareSync(loginDto.password, user.password)) {
      throw new UnauthorizedException('Invalid password');
    }

    return {
      accessToken: this.jwtService.sign({ userId: user.id, email: user.email }),
      user: user,
    };
  }

  async refresh(user: UserEntity) {
    const refreshedUser = await this.userService.findById(user.id);

    return {
      accessToken: this.jwtService.sign({
        userId: refreshedUser.id,
        email: refreshedUser.email,
      }),
      user: refreshedUser,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordToken = await this.userService.createResetPasswordToken(
      user.email,
      new Date(Date.now() + 1000 * 60 * 60),
    );

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        passwordToken.token,
      );
    } catch (error) {
      await this.userService.deletePasswordResetToken(passwordToken.id);
      Logger.error('[RESET PASSWORD] Email not sent', error);
      throw new InternalServerErrorException('Email not sent');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const passwordToken = await this.userService.getPasswordResetToken(token);

    if (!passwordToken) {
      throw new NotFoundException('Invalid token');
    }

    if (passwordToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    const hashedPassword = await hash(newPassword, 10);

    await this.userService.update(passwordToken.userId, {
      password: hashedPassword,
      lastPasswordChange: new Date(),
    });

    await this.userService.deletePasswordResetToken(passwordToken.id);
  }

  async verifyEmail(token: string) {
    const userToken = await this.userService.getVerificationToken(token);

    if (!userToken) {
      throw new NotFoundException('Invalid token');
    }

    if (userToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    await this.userService.update(userToken.userId, {
      isVerified: true,
    });

    await this.userService.deleteVerificationToken(userToken.id);
  }

  async googleLogin(req: Request, res: Response) {
    console.log(req);
    if (!req.user) {
      return res.status(401).json({ message: 'No user from Google' });
    }

    const frontendUrl = this.configService.get('frontendUrl');
    const token = (req.user as any).accessToken;
    const redirectUrl = `${frontendUrl}/auth/redirect?token=${encodeURIComponent(token)}`;

    return res.redirect(redirectUrl);
  }

  async staffLogin(loginDto: LoginDto) {
    const staffUser = await this.staffUserService.findByEmail(loginDto.email);
    if (!staffUser) {
      throw new NotFoundException('Staff user not found');
    }

    if (!compareSync(loginDto.password, staffUser.password)) {
      throw new UnauthorizedException('Invalid password');
    }

    const response = {
      accessToken: this.jwtService.sign({
        userId: staffUser.id,
        email: staffUser.email,
      }),
      user: staffUser,
    };
    return response;
  }
}
