import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';

@Injectable()
export class SendGridClient {
  private readonly logger = new Logger(SendGridClient.name);
  constructor(private readonly configService: ConfigService) {
    sendgrid.setApiKey(this.configService.get('sendgrid.apiKey'));
  }

  async send(mail: Omit<sendgrid.MailDataRequired, 'from'>): Promise<void> {
    try {
      await sendgrid.send({
        ...mail,
        from: {
          email: this.configService.get('mail.address'),
          name: this.configService.get('mail.name'),
        },
        text: mail.text || ' ',
      });
      this.logger.log(
        `[SendGrid] Email successfully dispatched to ${mail.to as string}`,
      );
    } catch (error) {
      this.logger.error('[SendGrid] Error while sending email', error);
      throw error;
    }
  }
}
