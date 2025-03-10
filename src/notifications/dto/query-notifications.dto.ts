import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationParams } from '../../types/pagination';
import { IsEnum, IsOptional } from 'class-validator';
import { notificationCategoryEnum } from '../enum/notifications.enum';

export class NotificationsFilterParamsDto extends IntersectionType(
  PaginationParams,
) {
  @ApiProperty({
    description: `${Object.values(notificationCategoryEnum)} or empty for all`,
    required: false,
  })
  @IsOptional()
  @IsEnum(notificationCategoryEnum)
  category?: notificationCategoryEnum;
}
