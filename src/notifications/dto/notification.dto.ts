import {
  notificationCategoryEnum,
  notificationTypeEnum,
} from '../enum/notifications.enum';

export class lawyerRequestDetailsDto {
  chatThreadId: string;
  lawyerId: string;
  userId: string;
  companyId: string;
  chatCompanyId: string;
}
export class NotificationDto {
  id: string;
  readed: boolean;
  category: notificationCategoryEnum | string;
  type: notificationTypeEnum | string;
  createdAt: Date;
  updatedAt: Date;
  //DETAILS
  lawyerRequest?: lawyerRequestDetailsDto;
}
