import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';
import { hash } from 'bcrypt';
import { v4 } from 'uuid';
import { EmailService } from 'src/email/email.service';
import { UserJwtPayload } from 'src/auth/types/jwt-payload.types';
import { Prisma, UserCompany } from '@prisma/client';
import { use } from 'passport';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: EmailService,
  ) {}

  async registerUser(user: CreateUserDto) {
    const { password: plainPassword, ...rest } = user;

    const hashedPassword = await hash(plainPassword, 10);

    return this.userRepository.create({
      ...rest,
      password: hashedPassword,
      lastPasswordChange: null,
      isVerified: false,
      isAdmin: false,
      name: null,
      phoneNumber: null,
    });
  }

  async registerUserWithProvider(
    user: Omit<CreateUserDto, 'password'> & { name: string },
  ) {
    const password = v4();
    const hashedPassword = await hash(password, 10);

    return this.userRepository.create({
      ...user,
      password: hashedPassword,
      lastPasswordChange: null,
      isVerified: true,
      isAdmin: false,
      phoneNumber: null,
    });
  }

  async getUser(userJwtPayload: UserJwtPayload) {
    const user = await this.findById(userJwtPayload.id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userCompanies = await this.getCompanies(user);
    const hasCompletedSetup = userCompanies.some(
      (company) => company.hasCompletedSetup,
    );

    // Add the isAdmin property to the user object
    // This assumes you're either:
    // 1. Getting this from a database field that wasn't included in your initial query
    // 2. Setting a default value
    const userWithAdmin = {
      ...user,
      // isAdmin: user.isAdmin || false, // Use existing value or default to false
    };

    return {
      ...userWithAdmin,
      hasRegisteredCompanies: hasCompletedSetup,
      companies: userCompanies,
    };
  }

  findAll() {
    return this.userRepository.findAll();
  }

  findById(id: UserEntity['id']) {
    return this.userRepository.findOne(id);
  }

  findByEmail(email: UserEntity['email']) {
    return this.userRepository.findByEmail(email);
  }

  update(id: UserEntity['id'], user: Partial<UserEntity>) {
    return this.userRepository.update(id, user);
  }

  remove(id: UserEntity['id']) {
    return this.userRepository.remove(id);
  }

  async createResetPasswordToken(email: UserEntity['email'], expiresAt: Date) {
    const tokenUuid = v4();

    const hashedToken = await hash(tokenUuid, 10);

    const passwordTokens = await this.userRepository.getPassWordTokens({
      User: {
        email,
      },
      createdAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    });

    if (passwordTokens.length >= 3) {
      throw new BadRequestException(
        'Too many password reset requests, try again later',
      );
    }

    return this.userRepository.createResetPasswordToken(
      email,
      hashedToken,
      expiresAt,
    );
  }

  async createVerificationToken(user: UserEntity) {
    const tokenUuid = v4();

    const hashedToken = await hash(tokenUuid, 10);

    return this.userRepository.createVerificationToken(
      user.email,
      hashedToken,
      new Date(Date.now() + 1000 * 60 * 60 * 24),
    );
  }

  getPasswordResetToken(token: string) {
    return this.userRepository.getPasswordToken(token);
  }

  deletePasswordResetToken(tokenId: string) {
    return this.userRepository.deletePasswordResetToken(tokenId);
  }

  getVerificationToken(token: string) {
    return this.userRepository.getVerificationToken(token);
  }

  deleteVerificationToken(tokenId: string) {
    return this.userRepository.deleteVerificationToken(tokenId);
  }

  async getCompanies(user: UserEntity) {
    return this.userRepository.getCompanies(user.id);
  }

  async getListByCompany(companyId: string) {
    const list = await this.userRepository.getUsersByCompany(companyId);

    const users = [];
    for (const userCompany of list) {
      users.push({
        id: userCompany.User.id,
        name: userCompany.User.name,
      });
    }

    return users;
  }
}
