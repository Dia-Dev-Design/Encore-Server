import { Injectable, Logger } from '@nestjs/common';
import {
  CalendlyEventType,
  CalendlyWebhookPayload,
} from './types/calendly-webhook.types';
import { MeetingsRepository } from 'src/meetings/meetings.repository';
import { MeetingStatus } from '@prisma/client';
import { MeetingEntity } from 'src/meetings/entities/meeting.entity';
import { UserService } from 'src/user/services/user.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly userService: UserService,
  ) {}

  async processWebhook(payload: CalendlyWebhookPayload) {
    this.logger.log(`Processing Calendly webhook: ${payload.event}`);

    switch (payload.event) {
      case CalendlyEventType.INVITEE_CREATED:
        return this.handleMeetingScheduled(payload);

      case CalendlyEventType.INVITEE_CANCELED:
        return this.handleMeetingCanceled(payload);

      case CalendlyEventType.INVITEE_RESCHEDULED:
        return this.handleMeetingRescheduled(payload);

      default:
        this.logger.warn(`Unhandled webhook event type: ${payload.event}`);
    }
  }

  private async handleMeetingScheduled(payload: CalendlyWebhookPayload) {
    const { scheduled_event, email } = payload.payload;
    this.logger.log(
      `New meeting scheduled by ${email} for ${scheduled_event.start_time}`,
    );

    const user = await this.userService.findByEmail(email);

    if (!user) {
      this.logger.error(`User not found for email: ${email}`);
      return;
    }

    const companies = await this.userService.getCompanies(user);

    if (companies.length === 0) {
      this.logger.error(`User ${user.id} has no companies`);
      return;
    }

    const meeting = new MeetingEntity({
      companyId: companies[0].id,
      userId: user.id,
      date: new Date(scheduled_event.start_time),
      joinUrl: scheduled_event.location.join_url,
      status: MeetingStatus.PENDING,
    });

    return this.meetingsRepository.create(meeting);
  }

  private async handleMeetingCanceled(payload: CalendlyWebhookPayload) {
    const { scheduled_event, email } = payload.payload;
    this.logger.log(
      `Meeting canceled by ${email} for ${scheduled_event.start_time}`,
    );

    const meeting = await this.meetingsRepository.getByJoinUrl(
      scheduled_event.location.join_url,
    );

    if (!meeting) {
      this.logger.error(
        `Meeting not found for join url: ${scheduled_event.location.join_url}`,
      );
      return;
    }

    return this.meetingsRepository.update(meeting.id, {
      status: MeetingStatus.CANCELLED,
    });
  }

  private async handleMeetingRescheduled(payload: CalendlyWebhookPayload) {
    const { scheduled_event, email } = payload.payload;
    this.logger.log(
      `Meeting rescheduled by ${email} to ${scheduled_event.start_time}`,
    );

    const meeting = await this.meetingsRepository.getByJoinUrl(
      scheduled_event.location.join_url,
    );

    if (!meeting) {
      this.logger.error(
        `Meeting not found for join url: ${scheduled_event.location.join_url}`,
      );
      return;
    }

    return this.meetingsRepository.update(meeting.id, {
      date: new Date(scheduled_event.start_time),
    });
  }
}
