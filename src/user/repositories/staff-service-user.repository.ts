import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, StaffUser } from '@prisma/client';
import { PaginationParams } from 'src/types/pagination';

@Injectable()
export class StaffUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(pagination: PaginationParams) {
    return this.prisma.staffUser.findMany({
      skip: pagination.page ? Number(pagination.page) : undefined,
      take: pagination.limit ? Number(pagination.limit) : undefined,
    });
  }

  async findById(id: string): Promise<StaffUser | null> {
    return this.prisma.staffUser.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<StaffUser | null> {
    return this.prisma.staffUser.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.StaffUserCreateInput): Promise<StaffUser> {
    return this.prisma.staffUser.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.StaffUserUpdateInput,
  ): Promise<StaffUser> {
    return this.prisma.staffUser.update({
      where: { id },
      data,
    });
  }
}
