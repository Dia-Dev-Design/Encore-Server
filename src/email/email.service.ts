import { Injectable } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';
import { getResetPasswordTemplate, getVerifyEmailTemplate } from './templates';

@Injectable()
export class EmailService {
  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly configService: ConfigService,
  ) {}

  async sendTestEmail(
    recipient: string,
    body = 'This is a test mail',
  ): Promise<void> {
    const mail: MailDataRequired = {
      to: recipient,
      from: 'noreply@startupencore.ai',
      subject: 'Test email',
      content: [{ type: 'text/plain', value: body }],
    };
    await this.sendGridClient.send(mail);
  }

  async sendVerificationEmail(recipient: string, token: string): Promise<void> {
    const frontendUrl = `${this.configService.get('frontendUrl')}/verify-email?token=${encodeURIComponent(token)}`;
    this.sendGridClient.send({
      to: recipient,
      subject: 'Verify your email',
      html: getVerifyEmailTemplate(frontendUrl),
    });
  }

  async sendPasswordResetEmail(
    recipient: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const frontendUrl = `${this.configService.get('frontendUrl')}/reset-password?token=${encodeURIComponent(token)}`;
    this.sendGridClient.send({
      to: recipient,
      subject: 'Reset your password',
      html: getResetPasswordTemplate(frontendUrl, name),
    });
  }
}
