import { Injectable } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';
import {
  getResetPasswordTemplate,
  getVerifyEmailTemplate,
  getLawyerChatRequestTemplate,
  getLawyerResponseNotificationTemplate,
  getLawyerNotificationTemplate,
} from './templates';

@Injectable()
export class EmailService {
  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly configService: ConfigService
  ) {}

  async sendTestEmail(recipient: string, body = 'This is a test mail'): Promise<string> {
    // const mail: MailDataRequired = {
    //   to: recipient,
    //   from: this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@startupencore.ai',
    //   subject: 'Test email',
    //   html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
    //     <p>${body}</p>
    //     <p>This is a test email from Encore.</p>
    //   </div>`,
    // };
    // await this.sendGridClient.send(mail);
    return 'Hello line 34 also fix line 23 type';
  }

  async sendVerificationEmail(recipient: string, token: string): Promise<string> {
    // const frontendUrl = `${this.configService.get('frontendUrl')}/verify-email?token=${encodeURIComponent(token)}`;
    // this.sendGridClient.send({
    //   to: recipient,
    //   subject: 'Verify your email',
    //   html: getVerifyEmailTemplate(frontendUrl),
    // });
    return 'Hello line 44, also fix line 37';
  }

  async sendPasswordResetEmail(recipient: string, token: string, name?: string): Promise<string> {
    // const frontendUrl = `${this.configService.get('frontendUrl')}/reset-password?token=${encodeURIComponent(token)}`;
    // this.sendGridClient.send({
    //   to: recipient,
    //   subject: 'Reset your password',
    //   html: getResetPasswordTemplate(frontendUrl, name),
    // });
    return 'Hello line 58, also fix line 51';
  }

  async sendLawyerChatRequestEmail(recipient: string, name?: string): Promise<string> {
    // this.sendGridClient.send({
    //   to: recipient,
    //   subject: 'Your Chat with a Lawyer Request',
    //   html: getLawyerChatRequestTemplate(name),
    // });
    return 'Hello line 70, also fix line 64';
  }

  async sendLawyerResponseNotificationEmail(
    recipient: string,
    name?: string,
    lawyerName?: string
  ): Promise<string> {
    // this.sendGridClient.send({
    //   to: recipient,
    //   subject: 'A Lawyer Has Responded to Your Chat',
    //   html: getLawyerResponseNotificationTemplate(name, lawyerName),
    // });ne
    return 'Hello line 83 also, fix line 77';
  }

  async sendLawyerNotificationEmail(
    lawyerEmail: string,
    userName: string,
    companyName?: string,
    threadId?: string
  ): Promise<string> {
    //   this.sendGridClient.send({
    //     to: lawyerEmail,
    //     subject: 'New Chat Request from a User',
    //     html: getLawyerNotificationTemplate(userName, companyName, threadId),
    //   });
    // }
    return 'Fix line 98, and fix line 91';
  }
}