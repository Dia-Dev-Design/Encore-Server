import { Module } from '@nestjs/common';
import { StaffUserController } from './staff-user.controller';
import { StaffUserService } from './staff-user.service';

@Module({
  controllers: [StaffUserController],
  providers: [StaffUserService]
})
export class StaffUserModule {}
