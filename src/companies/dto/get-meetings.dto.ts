import { MeetingStatus } from '@prisma/client';
import { PaginationResponse } from 'src/types/pagination';
import { ApiProperty } from '@nestjs/swagger';
import { MeetingsPlatform } from 'src/meetings/enums/meetings-platform.enum';

export class MeetingDto {
  @ApiProperty({
    description: 'Unique identifier for the meeting',
    example: 'meeting-12345',
  })
  id: string;

  @ApiProperty({
    description: 'Date and time of the meeting',
    example: '2023-01-01T10:00:00Z',
  })
  date: Date;

  @ApiProperty({
    description: 'Time of the meeting',
    example: '10:00:00',
  })
  time: Date;

  @ApiProperty({
    description: 'URL to join the meeting',
    example: 'https://example.com/join/meeting-12345',
  })
  joinUrl: string;

  @ApiProperty({
    description: 'Current status of the meeting',
    example: 'Scheduled',
  })
  status: MeetingStatus;

  @ApiProperty({
    description: 'Type of the meeting (e.g., video, audio)',
    example: 'Video',
  })
  meetingType: string;

  @ApiProperty({
    description: 'Meeting platform',
    example: 'Google Meet',
    enum: MeetingsPlatform,
  })
  platform: MeetingsPlatform;
}

export class GetMeetingsDto {
  @ApiProperty({
    description: 'List of meetings',
    type: [MeetingDto],
  })
  data: MeetingDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationResponse,
  })
  pagination: PaginationResponse;
}
