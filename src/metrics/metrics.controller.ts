import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsDto } from './dto/metrics';
import { ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Metrics for the given period',
  })
  async getMetrics(
    @Query('period') period: 'current_week' | 'last_week' | 'last_month',
  ) {
    const periodDto: MetricsDto = { option: period };
    return this.metricsService.getMetrics(periodDto);
  }
}
