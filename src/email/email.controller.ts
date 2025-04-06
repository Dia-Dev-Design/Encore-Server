import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { Public } from 'src/auth/decorators/public.decorator';

class SendTestEmailDto {
  @IsEmail()
  recipient: string;

  @IsString()
  @IsOptional()
  body?: string;
}

class EmailDTO {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  subject: string;

  @IsString()
  message: string;
}


@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

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

  @Public()
  @Post('bug-report')
  async sendBugReport(
    @Body() bugReportDto: EmailDTO,
  ): Promise<{ message: string }> {
    try {
      await this.emailService.sendBugReportEmail(
        bugReportDto.name,
        bugReportDto.email,
        bugReportDto.subject,
        bugReportDto.message,
      );
      return { message: 'Bug report sent successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to send bug report email');
    }
  }

  @Public()
  @Post('feature-request')
  async sendFeatureRequest(
    @Body() dto: EmailDTO,
  ): Promise<{ message: string }> {
    try {
      await this.emailService.sendFeatureRequestEmail(
        dto.name,
        dto.email,
        dto.subject,
        dto.message,
      );
      return { message: 'Feature request sent successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to send feature request email');
    }
  }

  @Public()
  @Post('feedback')
  async sendFeedback(
    @Body() dto: EmailDTO,
  ): Promise<{ message: string }> {
    try {
      await this.emailService.sendFeedbackEmail(
        dto.name,
        dto.email,
        dto.subject,
        dto.message,
      );
      return { message: 'Feedback sent successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to send feedback email');
    }
  }


} 