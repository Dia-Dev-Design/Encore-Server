import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetricsResponseDto, MetricsDto } from './dto/metrics';

@Injectable()
export class MetricsService {
  constructor(private readonly prismaService: PrismaService) {}

  private getRange(option: 'current_week' | 'last_week' | 'last_month') {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    const startPrev = new Date();
    const endPrev = new Date();

    switch (option) {
      case 'current_week':
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);

        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        startPrev.setDate(start.getDate() - 7);
        endPrev.setDate(startPrev.getDate() + 7);
        break;

      case 'last_week':
        const lastWeekDay = now.getDay();
        const lastWeekDiff = lastWeekDay === 0 ? 6 : lastWeekDay - 1;
        end.setDate(now.getDate() - lastWeekDiff - 1);
        end.setHours(23, 59, 59, 999);

        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        startPrev.setDate(start.getDate() - 7);
        endPrev.setDate(startPrev.getDate() + 7);
        console.log('actual', start, end);
        console.log('prev', startPrev, endPrev);
        break;

      case 'last_month':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);

        end.setMonth(now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);

        startPrev.setMonth(start.getMonth() - 1, 1);
        endPrev.setMonth(startPrev.getMonth(), 0);
        break;

      default:
        throw new BadRequestException('Invalid date range option.');
    }

    return { start, end, startPrev, endPrev };
  }

  private async calculateCount(
    start: Date,
    end: Date,
    model: 'user' | 'meeting' | 'company',
    additionalFilter: Record<string, any> = {},
  ) {
    switch (model) {
      case 'user':
        return this.prismaService.user.count({
          where: {
            createdAt: { gte: start, lte: end },
            ...additionalFilter,
          },
        });
      case 'meeting':
        return this.prismaService.meeting.count({
          where: {
            createdAt: { gte: start, lte: end },
            ...additionalFilter,
          },
        });
      case 'company':
        return this.prismaService.company.count({
          where: {
            createdAt: { gte: start, lte: end },
            ...additionalFilter,
          },
        });
      default:
        throw new Error('Unsupported model');
    }
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }

  private calculateTotalRateProspectsClients(
    totalSignUps: number,
    activeDissolutions: number,
  ) {
    const total = totalSignUps + activeDissolutions;
    if (total === 0) return { prospects: 0, clients: 0 };
    const prospects = parseFloat(((totalSignUps / total) * 100).toFixed(2));
    const clients = parseFloat(((activeDissolutions / total) * 100).toFixed(2));
    return { prospects, clients };
  }

  async countAIResponses(userId?: string) {
    try {
      const threads = await this.prismaService.chatThread.findMany({
        where: { userId },
        select: { id: true },
      });
      if (threads.length === 0) {
        return 0;
      }
      const threadIds = threads.map((thread) => thread.id);
      const count = await this.prismaService.checkpoint.count({
        where: {
          thread_id: { in: threadIds },
        },
      });

      return count;
    } catch (error) {
      console.error('Error counting checkpoints:', error);
      return 0;
    }
  }

  async calculateCostSavings(userId?: string) {
    console.log('userId', userId);
    try {
      const aiResponsesCount = await this.countAIResponses(userId);
      console.log('aiResponsesCount', aiResponsesCount);

      const hoursPerQuestion = 0.3;
      const averageHourlyCost = 961;
      const nonEncorePerHourCost = 2883;
      const encoreCost = 250;
      const traditionalCost =
        aiResponsesCount * hoursPerQuestion * nonEncorePerHourCost;
      const costSavings = traditionalCost - encoreCost;
      const timeSavedHours = aiResponsesCount * hoursPerQuestion;
      const timeSavedDays = Math.floor(timeSavedHours / 8);
      const remainingHours = Math.round((timeSavedHours % 8) * 10) / 10; // Round to 1 decimal place

      return {
        questionCount: aiResponsesCount,
        nonEncoreResponseTime: hoursPerQuestion,
        averageHourlyCost,
        nonEncorePerHourCost,
        encoreCost,
        costSavings: costSavings > 0 ? costSavings : 0,
        timeSaved: {
          hours: timeSavedHours,
          workdays: timeSavedDays,
          remainingHours: remainingHours,
          formatted: `${timeSavedDays} days, ${remainingHours} hours`,
        },
      };
    } catch (error) {
      console.error('Error calculating cost savings:', error);
      return {
        questionCount: 0,
        nonEncoreResponseTime: 0.3,
        averageHourlyCost: 961,
        nonEncorePerHourCost: 2883,
        encoreCost: 250,
        costSavings: 0,
        timeSaved: {
          hours: 0,
          workdays: 0,
          remainingHours: 0,
          formatted: '0 days, 0 hours',
        },
      };
    }
  }

  async getMetrics(dto: MetricsDto) {
    const { start, end, startPrev, endPrev } = this.getRange(dto.option);

    const totalSignUps = await this.calculateCount(start, end, 'user');
    const totalActiveOnboarding = await this.calculateCount(
      start,
      end,
      'meeting',
      { status: 'PENDING' },
    );
    const activeDissolutions = await this.calculateCount(
      start,
      end,
      'company',
      { hasBeenEvaluated: true },
    );

    const totalSignUpsPrev = await this.calculateCount(
      startPrev,
      endPrev,
      'user',
    );
    const totalActiveOnboardingPrev = await this.calculateCount(
      startPrev,
      endPrev,
      'meeting',
      { status: 'PENDING' },
    );
    const activeDissolutionsPrev = await this.calculateCount(
      startPrev,
      endPrev,
      'company',
      { hasBeenEvaluated: true },
    );
    const signupChange = this.calculatePercentageChange(
      totalSignUps,
      totalSignUpsPrev,
    );
    const onboardingChange = this.calculatePercentageChange(
      totalActiveOnboarding,
      totalActiveOnboardingPrev,
    );
    const dissolutionChange = this.calculatePercentageChange(
      activeDissolutions,
      activeDissolutionsPrev,
    );

    const { prospects, clients } =
      await this.calculateTotalRateProspectsClients(
        totalSignUps,
        activeDissolutions,
      );
    const rateProspectsClientsChange = this.calculatePercentageChange(
      totalSignUps + activeDissolutions,
      totalSignUpsPrev + activeDissolutionsPrev,
    );

    // Calculate cost savings for the current period
    const costSavings = await this.calculateCostSavings();

    return {
      signups: {
        total: totalSignUps,
        changeRate: signupChange,
      },
      onboardings: {
        total: totalActiveOnboarding,
        changeRate: onboardingChange,
      },
      dissolutions: {
        total: activeDissolutions,
        changeRate: dissolutionChange,
      },
      rate_prospects_clients: {
        prospects,
        clients,
        change_rate: rateProspectsClientsChange,
        prospects_to_clients: activeDissolutions - activeDissolutionsPrev,
      },
      cost_savings: costSavings,
    };
  }
}
