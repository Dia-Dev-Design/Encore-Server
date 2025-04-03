import { Injectable } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OmitCreateProperties } from 'src/types/omit-createproperties';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(user: OmitCreateProperties<UserEntity>) {
    if (user.isActivated === undefined) {
      user.isActivated = false;
    }
    
    return this.prisma.user.create({
      data: user,
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: UserEntity['id']) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: UserEntity['email']) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  update(id: UserEntity['id'], user: Partial<UserEntity>) {
    return this.prisma.user.update({
      where: { id },
      data: user,
    });
  }

  remove(id: UserEntity['id']) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async createResetPasswordToken(
    email: UserEntity['email'],
    token: string,
    expiresAt: Date,
  ) {
    return await this.prisma.userResetPassword.create({
      data: {
        User: {
          connect: { email },
        },
        token,
        expiresAt,
      },
    });
  }

  getPassWordTokens(where: Prisma.UserResetPasswordWhereInput) {
    return this.prisma.userResetPassword.findMany({
      where,
    });
  }

  getPasswordToken(token: string) {
    return this.prisma.userResetPassword.findUnique({
      where: { token },
    });
  }

  deletePasswordResetToken(tokenId: string) {
    return this.prisma.userResetPassword.delete({
      where: { id: tokenId },
    });
  }

  createVerificationToken(
    email: UserEntity['email'],
    token: string,
    expiresAt: Date,
  ) {
    return this.prisma.userVerification.create({
      data: {
        User: {
          connect: { email },
        },
        token,
        expiresAt,
      },
    });
  }

  getVerificationToken(token: string) {
    return this.prisma.userVerification.findUnique({
      where: { token },
    });
  }

  deleteVerificationToken(tokenId: string) {
    return this.prisma.userVerification.delete({
      where: { id: tokenId },
    });
  }

  getCompanies(userId: UserEntity['id']) {
    return this.prisma.company.findMany({
      where: {
        UserCompany: {
          some: {
            userId: userId,
          },
        },
      },
    });
  }

  async getUsersByCompany(companyId: string) {
    return await this.prisma.userCompany.findMany({
      where: { companyId },
      select: { User: true },
    });
  }

  async findNonActivatedUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActivated: false,
          isAdmin: false,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({
        where: {
          isActivated: false,
          isAdmin: false,
        },
      }),
    ]);

    return {
      users,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit,
      },
    };
  }
}
