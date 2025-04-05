import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
      

      if (error.response && error.response.body && error.response.body.errors) {

        const maxCreditsExceeded = error.response.body.errors.some(
          (err) => err.message === 'Maximum credits exceeded'
        );
        
        if (maxCreditsExceeded) {
          this.logger.warn('[SendGrid] Maximum credits exceeded. Email not sent.');
          throw new ServiceUnavailableException('Email service temporarily unavailable: Maximum credits exceeded');
        }
      }
      
      // For all other errors, throw a more general exception
      throw new ServiceUnavailableException('Failed to send email: ' + (error.message || 'Unknown error'));
    }
  }
}
