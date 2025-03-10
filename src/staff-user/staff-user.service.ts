import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffUserService {
  constructor(private readonly prisma: PrismaService) {}
  async getSimpleStaff() {
    return await this.prisma.staffUser.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
