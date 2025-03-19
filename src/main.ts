import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import configuration from './config/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { JwtAuthGuard } from './auth/auth.guard';
import { StaffJwtAuthGuard } from './auth/staff-auth.guard';

const config = configuration();

async function bootstrap() {
  const logger = new Logger();
  const app = await NestFactory.create(AppModule, {
    //forceCloseConnections: true,
  });

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
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Encore API')
    .setDescription('Encore API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new StaffJwtAuthGuard(reflector),
  );

  // TODO: Remove this in production
  app.enableCors({
    origin: ['http://localhost:3000', 'https://dev.startupencore.ai'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  const port = config.port || 3001;

  SwaggerModule.setup('api/docs', app, document);
  await app.listen(port);
  logger.log(`Application listening on port: ${port}`);
}
bootstrap();
