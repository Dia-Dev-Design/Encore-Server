import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'object' && exceptionResponse['message'] 
        ? exceptionResponse['message'] 
        : exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Check for SendGrid specific errors
      if (this.isSendGridError(exception)) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Email service is temporarily unavailable';
        
        // Log detailed error information
        this.logger.error(
          `SendGrid Error: ${this.extractSendGridErrorMessage(exception)}`,
          exception.stack,
        );
      } else {
        // Log other unhandled errors
        this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      }
    } else {
      this.logger.error('Unknown exception', exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private isSendGridError(error: any): boolean {
    return (
      error.name === 'ResponseError' &&
      error.code === 401 &&
      error.response?.body?.errors?.some(
        (err: any) => err.message === 'Maximum credits exceeded'
      )
    );
  }

  private extractSendGridErrorMessage(error: any): string {
    try {
      if (error.response?.body?.errors?.length > 0) {
        return error.response.body.errors
          .map((err: any) => err.message)
          .join(', ');
      }
      return error.message;
    } catch (e) {
      return 'Failed to extract SendGrid error message';
    }
  }
} 