import { Injectable } from '@nestjs/common';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { PaginationParams } from 'src/types/pagination';
import { MeetingsRepository } from './meetings.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(query: PaginationParams) {
    return this.meetingsRepository.findAll(query);
  }

  findOne(id: string) {
    return this.meetingsRepository.findOne(id);
  }

  update(id: string, updateMeetingDto: UpdateMeetingDto) {
    return this.meetingsRepository.update(id, updateMeetingDto);
  }

  remove(id: string) {
    return this.meetingsRepository.remove(id);
  }
}
