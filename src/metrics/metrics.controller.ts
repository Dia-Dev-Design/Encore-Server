import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsDto, DashboardCostFormulaDto } from './dto/metrics';
import { ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { User } from 'src/auth/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';

@ApiTags('Metrics')
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

  @Get('cost/formula')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Cost formula metrics for dashboard display',
  })
  async getDashboardCostMetrics(@User() user: UserEntity) {
    return await this.metricsService.calculateCostSavings(user.id);
  }
}
