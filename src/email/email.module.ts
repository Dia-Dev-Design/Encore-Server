import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendGridClient } from './sendgrid-client';
import { EmailController } from './email.controller';

@Module({
  controllers: [EmailController],
  providers: [EmailService, SendGridClient],
  exports: [EmailService],
})
export class EmailModule {}
