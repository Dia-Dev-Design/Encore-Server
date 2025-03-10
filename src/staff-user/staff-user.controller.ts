import { Controller, Get, Query } from '@nestjs/common';
import { StaffUserService } from './staff-user.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('staff-user')
export class StaffUserController {
  constructor(private readonly staffUserService: StaffUserService) {}
  @Get('simple-list')
  @Public()
  async getSimpleStaffUser() {
    return await this.staffUserService.getSimpleStaff();
  }
}
