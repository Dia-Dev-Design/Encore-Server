import { IsEnum } from 'class-validator';

export class MetricsDto {
  @IsEnum(['current_week', 'last_week', 'last_month'])
  option: 'current_week' | 'last_week' | 'last_month';
}

export class MetricsResponseDto {
  signups: { total: number; changeRate: number };
  onboardings: { total: number; changeRate: number };
  dissolutions: { total: number; changeRate: number };
  rate_prospects_clients: {
    prospects: number;
    clients: number;
    change_rate: number;
  };
}
