import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OmitCreateProperties } from 'src/types/omit-createproperties';
import { Meeting } from '@prisma/client';
import { PaginationParams } from 'src/types/pagination';
import { SortOrderEnum } from 'src/utils/enums/utils.enums';
import {
  CompanyMeetingSortObject,
  CompanyMeetingSortOptions,
} from 'src/companies/enums/companies-sort.enum';

@Injectable()
export class MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(meeting: OmitCreateProperties<Meeting>) {
    return this.prisma.meeting.create({
      data: meeting,
    });
  }

  findAll(query: PaginationParams) {
    return this.prisma.meeting.findMany({
      skip: query.page,
      take: query.limit,
    });
  }

  findOne(id: string) {
    return this.prisma.meeting.findUnique({
      where: {
        id,
      },
    });
  }

  update(id: string, updateData: Partial<OmitCreateProperties<Meeting>>) {
    return this.prisma.meeting.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  getByJoinUrl(joinUrl: string) {
    return this.prisma.meeting.findUnique({
      where: {
        joinUrl,
      },
    });
  }

  remove(id: string) {
    return this.prisma.meeting.delete({
      where: {
        id,
      },
    });
  }

  getMeetingsByCompanyId(
    companyId: string,
    pagination: PaginationParams,
    sort: CompanyMeetingSortOptions,
    sortOrder: SortOrderEnum,
  ) {
    return this.prisma.meeting.findMany({
      where: {
        companyId,
      },
      skip: pagination.page,
      take: pagination.limit,
      orderBy: {
        [CompanyMeetingSortObject[sort]]: sortOrder,
      },
    });
  }

  countMeetingsByCompanyId(companyId: string): Promise<number> {
    return this.prisma.meeting.count({
      where: {
        companyId,
      },
    });
  }

  getAllMeetingsByCompanyId(companyId: string): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: {
        companyId,
      },
    });
  }
}
