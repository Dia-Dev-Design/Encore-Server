import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class IndustriesRepository {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.industry.findMany();
  }
}
