import { Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { StaffAuth } from '../../auth/decorators/staff-auth.decorator';
import { NotificationsFilterParamsDto } from '../dto/query-notifications.dto';
import { NotificationsService } from '../services/notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('admin-list')
  @StaffAuth()
  @ApiBearerAuth()
  async getAdminNotification(
    @Request() req,
    @Query() payload: NotificationsFilterParamsDto,
  ) {
    return await this.notificationsService.getStaffNotifications(
      payload,
      req?.user?.id,
    );
  }

  @Post('read-admin/:notificationId')
  @StaffAuth()
  @ApiBearerAuth()
  async readAdminNotification(
    @Request() req,
    @Param('notificationId') notificationId: string,
  ) {
    return await this.notificationsService.readStaffNotification(
      req?.user?.id,
      notificationId,
    );
  }
}
