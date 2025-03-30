import { Module } from '@nestjs/common';
import { IndustriesService } from './industries.service';
import { IndustriesController } from './industries.controller';
import { IndustriesRepository } from './industries.repository';
@Module({
  controllers: [IndustriesController],
  providers: [IndustriesService, IndustriesRepository],
  exports: [IndustriesService, IndustriesRepository],
})
export class IndustriesModule {}
