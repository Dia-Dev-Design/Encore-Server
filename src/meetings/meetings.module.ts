import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsRepository } from './meetings.repository';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [],
  providers: [MeetingsService, MeetingsRepository],
  exports: [MeetingsService, MeetingsRepository],
  controllers: [MeetingsController],
})
export class MeetingsModule {}
