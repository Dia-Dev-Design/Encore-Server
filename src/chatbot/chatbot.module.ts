import { Module } from '@nestjs/common';

import { S3Module } from 'src/s3/s3.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ChatbotService } from './services/chatbot.service';
import { ChatLawyerService } from './services/chat-lawyer.service';

import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotLawyerController } from './controllers/chat-lawyer.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompaniesModule } from 'src/companies/companies.module';
import { DocHubModule } from 'src/dochub/dochub.module';

@Module({
  controllers: [ChatbotController, ChatbotLawyerController],
  providers: [ChatbotService, ChatLawyerService],
  imports: [
    S3Module,
    NotificationsModule,
    EventEmitterModule.forRoot(),
    CompaniesModule,
    DocHubModule,
  ],
})
export class ChatbotModule {}
