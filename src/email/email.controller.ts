import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

class SendTestEmailDto {
  @IsEmail()
  recipient: string;

  @IsString()
  @IsOptional()
  body?: string;
}

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @ApiOperation({ summary: 'Send a test email' })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email address or body format' })
  @ApiResponse({ status: 500, description: 'Failed to send test email' })
  async sendTestEmail(
    @Body() body: SendTestEmailDto,
  ): Promise<{ message: string }> {
    try {
      await this.emailService.sendTestEmail(body.recipient, body.body);
      return { message: 'Test email sent successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to send test email');
    }
  }
} 