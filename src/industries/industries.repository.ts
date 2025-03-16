import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class IndustriesRepository {
  constructor(private prisma: PrismaService) {}
  findAll() {
    console.log('These are our industries from industries repository', this.prisma.industry.findMany())
    return this.prisma.industry.findMany();
  }
}
