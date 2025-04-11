import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
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
    const app = await NestFactory.create(AppModule, {
      //forceCloseConnections: true,
      cors: false,
    });

    app.enableCors({
      origin: false,
    });

    // Add middleware to remove any CORS headers that might still be added
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.removeHeader('Access-Control-Allow-Origin');
      res.removeHeader('Access-Control-Allow-Methods');
      res.removeHeader('Access-Control-Allow-Headers');
      res.removeHeader('Access-Control-Allow-Credentials');
      next();
    });
    log.log('NestFactory created successfully');
    app.use(logger('dev'));
    app.use(helmet());
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

    // const app = await NestFactory.create(AppModule, {
    //   // Disable CORS entirely
    //   cors: false,
    // });

    const reflector = app.get(Reflector);
    log.log('Applying global guards...');
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    log.log('Global guards applied successfully');

    // TODO: Remove this in production

    const port = config.port || 3000;

    SwaggerModule.setup('api/docs', app, document);
    await app.listen(port);
    log.log(`Application listening on port: ${port}`);
  } catch (error) {
    log.error('Error during bootstrap:', error);
    throw error;
  }
}
bootstrap();
