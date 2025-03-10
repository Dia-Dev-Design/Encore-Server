import { SetMetadata } from '@nestjs/common';

export const StaffAuth = () => SetMetadata('isStaffRoute', true);
