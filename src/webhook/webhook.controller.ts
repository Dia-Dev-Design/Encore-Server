import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { CalendlyWebhookPayload } from './types/calendly-webhook.types';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('calendly')
  async handleCalendlyWebhook(
    @Body() payload: CalendlyWebhookPayload,
    @Headers('calendly-webhook-signature') signature: string,
  ) {
    // Verify the webhook signature
    if (!this.verifyWebhookSignature(signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Validate payload
    if (!payload.event || !payload.payload) {
      throw new BadRequestException('Invalid webhook payload');
    }

    return this.webhookService.processWebhook(payload);
  }

  private verifyWebhookSignature(signature: string): boolean {
    // TODO: Implement signature verification using Calendly's webhook signing secret (i dont have it)

    return true;
  }
}
