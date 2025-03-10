import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { MeetingsModule } from '../meetings/meetings.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [MeetingsModule, UserModule],
  providers: [WebhookService],
  controllers: [WebhookController],
})
export class WebhookModule {}
