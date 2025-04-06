import { Injectable, Logger } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendGridClient } from './sendgrid-client';
import { ConfigService } from '@nestjs/config';
import {
  getResetPasswordTemplate,
  getVerifyEmailTemplate,
  getLawyerChatRequestTemplate,
  getLawyerResponseNotificationTemplate,
  getLawyerNotificationTemplate,
  getBugReportTemplate
} from './templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  
  constructor(
    private readonly sendGridClient: SendGridClient,
    private readonly configService: ConfigService,
  ) { }

  async sendTestEmail(
    recipient: string,
    body = 'This is a test mail',
  ): Promise<void> {
    const mail: MailDataRequired = {
      to: recipient,
      from: this.configService.get('SENDGRID_FROM_EMAIL') || 'noreply@startupencore.ai',
      subject: 'Test email',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <p>${body}</p>
        <p>This is a test email from Encore.</p>
      </div>`,
    };
    await this.sendGridClient.send(mail);
  }

  async sendVerificationEmail(recipient: string, token: string): Promise<void> {
    try {
      const frontendUrl = `${this.configService.get('frontendUrl')}/verify-email?token=${encodeURIComponent(token)}`;
      await this.sendGridClient.send({
        to: recipient,
        subject: 'Verify your email',
        html: getVerifyEmailTemplate(frontendUrl),
      });
    } catch (error) {
      this.logger.error(`[Email] Failed to send verification email to ${recipient}`, error);
    }
  }

  async sendPasswordResetEmail(
    recipient: string,
    token: string,
    name?: string,
  ): Promise<void> {
    try {
      const frontendUrl = `${this.configService.get('frontendUrl')}/reset-password?token=${encodeURIComponent(token)}`;
      await this.sendGridClient.send({
        to: recipient,
        subject: 'Reset your password',
        html: getResetPasswordTemplate(frontendUrl, name),
      });
    } catch (error) {
      this.logger.error(`[Email] Failed to send password reset email to ${recipient}`, error);
    }
  }

  async sendLawyerChatRequestEmail(
    recipient: string,
    name?: string,
  ): Promise<void> {
    try {
      await this.sendGridClient.send({
        to: recipient,
        subject: 'Your Chat with a Lawyer Request',
        html: getLawyerChatRequestTemplate(name),
      });
    } catch (error) {
      this.logger.error(`[Email] Failed to send lawyer chat request email to ${recipient}`, error);
    }
  }

  async sendLawyerResponseNotificationEmail(
    recipient: string,
    name?: string,
    lawyerName?: string,
  ): Promise<void> {
    try {
      await this.sendGridClient.send({
        to: recipient,
        subject: 'A Lawyer Has Responded to Your Chat',
        html: getLawyerResponseNotificationTemplate(name, lawyerName),
      });
    } catch (error) {
      this.logger.error(`[Email] Failed to send lawyer response notification email to ${recipient}`, error);
    }
  }

  async sendLawyerNotificationEmail(
    lawyerEmail: string,
    userName: string,
    companyName?: string,
    threadId?: string,
  ): Promise<void> {
    try {
      await this.sendGridClient.send({
        to: lawyerEmail,
        subject: 'New Chat Request from a User',
        html: getLawyerNotificationTemplate(userName, companyName, threadId),
      });
    } catch (error) {
      this.logger.error(`[Email] Failed to send lawyer notification email to ${lawyerEmail}`, error);
    }
  }

  async sendBugReportEmail(
    name: string,
    userEmail: string,
    subject: string,
    message: string,
  ): Promise<void> {
    const supportEmail = process.env.SUPPORT_EMAIL

    await this.sendGridClient.send({
      to: supportEmail,
      subject: `New Bug Report`,
      html: getBugReportTemplate(name, userEmail, subject, message),
    });
  }

}
