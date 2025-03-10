import { Module } from '@nestjs/common';
import { IndustriesService } from './industries.service';
import { IndustriesController } from './industries.controller';
import { IndustriesRepository } from './industries.repositoty';
@Module({
  controllers: [IndustriesController],
  providers: [IndustriesService, IndustriesRepository],
})
export class IndustriesModule {}
