import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import configuration from './config/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { JwtAuthGuard } from './auth/auth.guard';
import { StaffJwtAuthGuard } from './auth/staff-auth.guard';
import logger from 'morgan';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

const config = configuration();

async function bootstrap() {
  const log = new Logger();
  log.log('Starting Encore server...');
  try {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for all origins with full options
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      preflightContinue: false,
      optionsSuccessStatus: 204,
      credentials: true,
      allowedHeaders: '*',  // Allow all headers
    });
    
    log.log('NestFactory created successfully');
    app.use(logger('dev'));
    
    // Configure helmet with CORS allowances
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: { policy: 'unsafe-none' },
      })
    );
    
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    app.useGlobalFilters(new GlobalExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Encore API')
      .setDescription('Encore API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    const reflector = app.get(Reflector);
    log.log('Applying global guards...');
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    log.log('Global guards applied successfully');

    const port = config.port || 3000;

    SwaggerModule.setup('api/docs', app, document);
    await app.listen(port);
    log.log(`Application listening on port: ${port}`);
    log.log(`CORS enabled for all origins`);
  } catch (error) {
    log.error('Error during bootstrap:', error);
    throw error;
  }
}
bootstrap();
