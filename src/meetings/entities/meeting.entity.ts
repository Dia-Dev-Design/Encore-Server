import { Meeting, MeetingStatus } from '@prisma/client';

export class MeetingEntity implements Meeting {
  companyId: string;
  userId: string;
  id: string;
  date: Date;
  joinUrl: string;
  status: MeetingStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<MeetingEntity>) {
    Object.assign(this, partial);
  }
}
