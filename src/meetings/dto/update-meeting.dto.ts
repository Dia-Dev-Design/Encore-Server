import { PartialType } from '@nestjs/swagger';
import { CreateMeetingDto } from './create-meeting.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeetingDto extends PartialType(CreateMeetingDto) {}
