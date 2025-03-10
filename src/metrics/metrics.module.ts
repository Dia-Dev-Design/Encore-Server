import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  imports: [PrismaModule],
})
export class MetricsModule {}
