import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { EmailModule } from './email/email.module';
import { RegistrationModule } from './registration/registration.module';
import { CompaniesModule } from './companies/companies.module';
import { MeetingsModule } from './meetings/meetings.module';
import { IndustriesModule } from './industries/industries.module';
import { MetricsModule } from './metrics/metrics.module';
import config from './config/config';
import { WebhookModule } from './webhook/webhook.module';
import { TasksModule } from './tasks/tasks.module';
import { StaffUserModule } from './staff-user/staff-user.module';
import { S3Module } from './s3/s3.module';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocHubModule } from './dochub/dochub.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV}`],
      load: [config],
      isGlobal: true,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    EmailModule,
    RegistrationModule,
    CompaniesModule,
    MeetingsModule,
    IndustriesModule,
    WebhookModule,
    MetricsModule,
    TasksModule,
    ChatbotModule,
    StaffUserModule,
    S3Module,
    FilesModule,
    FoldersModule,
    NotificationsModule,
    DocHubModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
