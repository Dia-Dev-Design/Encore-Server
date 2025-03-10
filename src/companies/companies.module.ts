import { Module } from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { UserModule } from 'src/user/user.module';
import { TasksModule } from '../tasks/tasks.module';
import { MeetingsModule } from 'src/meetings/meetings.module';

@Module({
  imports: [UserModule, TasksModule, MeetingsModule],
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService],
  exports: [CompaniesService, CompaniesRepository],
})
export class CompaniesModule {}
