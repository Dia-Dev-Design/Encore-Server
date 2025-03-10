import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  notificationCategoryEnum,
  notificationTypeEnum,
} from '../enum/notifications.enum';
import { NotificationsFilterParamsDto } from '../dto/query-notifications.dto';
import { calcPagination } from '../../utils/calc-pagination';
import { Prisma } from '@prisma/client';
import { NotificationDto } from '../dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaffNotifications(
    payload: NotificationsFilterParamsDto,
    staffUserId: string,
  ) {
    const { page, limit } = payload;

    let filter: Prisma.NotificationsStaffWhereInput = { staffId: staffUserId };
    if (payload.category) {
      filter = {
        ...filter,
        category: payload.category,
      };
    }

    const skip = calcPagination(page, limit);
    const list = await this.prisma.notificationsStaff.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit ? Number(limit) : undefined,
    });

    const totalItems = await this.prisma.notificationsStaff.count({
      where: filter,
    });
    const totalUnread = await this.prisma.notificationsStaff.count({
      where: { ...filter, readed: false },
    });
    const totalPages = Math.ceil(totalItems / limit);

    const notifications: NotificationDto[] = [];

    for (const notification of list) {
      const noti: NotificationDto = {
        id: notification.id,
        readed: notification.readed,
        category: notification.category,
        type: notification.type,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      };
      await this.setNotificationsDetails(notification.actionRedirectId, noti);
      notifications.push(noti);
    }

    return {
      list: notifications,
      totalUnread,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        offset: page,
      },
    };
  }

  async setNotificationsDetails(
    actionId: string,
    notification: NotificationDto,
  ) {
    //all details init in null
    if (!actionId) return;
    notification.lawyerRequest = null;

    if (notification.type === notificationTypeEnum.LAWYER_REQUEST) {
      const chatLawyer = await this.prisma.chatLawyer.findFirst({
        where: { id: actionId },
        select: {
          lawyerId: true,
          userRequestId: true,
          ChatThreadId: true,
          ChatThread: {
            select: {
              ChatCompany: {
                select: {
                  id: true,
                  companyId: true,
                },
              },
            },
          },
        },
      });
      if (!chatLawyer) {
        return;
      }

      notification.lawyerRequest = {
        chatThreadId: chatLawyer.ChatThreadId,
        lawyerId: chatLawyer.lawyerId,
        userId: chatLawyer.userRequestId,
        companyId: chatLawyer.ChatThread.ChatCompany.companyId,
        chatCompanyId: chatLawyer.ChatThread.ChatCompany.id,
      };

      return;
    }
  }
  async readStaffNotification(staffUserId: string, notificationId: string) {
    const notification = await this.prisma.notificationsStaff.findFirst({
      where: {
        id: notificationId,
        staffId: staffUserId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.readed) {
      return { readed: true };
    }

    await this.prisma.notificationsStaff.update({
      where: { id: notificationId },
      data: { readed: true },
    });

    return { readed: true };
  }

  async createStaffNotification(
    type: notificationTypeEnum,
    category: notificationCategoryEnum,
    staffId: string,
    payload: any,
  ) {
    const content = this.getContentTemplateToStaff(type, payload);

    await this.prisma.notificationsStaff.create({
      data: {
        staffId,
        staffOriginIdString: payload['staffOriginIdString'] || null,
        userOriginId: payload['userOriginId'] || null,
        content,
        category,
        type,
        actionRedirectId: payload['actionRedirectId'] || null,
      },
    });
  }

  getContentTemplateToStaff(type: notificationTypeEnum, payload: any) {
    if (type === notificationTypeEnum.LAWYER_REQUEST) {
      return `${payload['userClientName']} from ${payload['companyName']} submitted request for Counsel review or revision`;
    }
  }
}
