import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';

import { UserRepository } from './repositories/user.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailModule } from 'src/email/email.module';
import { StaffUserRepository } from './repositories/staff-service-user.repository';
import { StaffUserService } from './services/staff-service-user.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    StaffUserRepository,
    StaffUserService,
  ],
  exports: [UserService, UserRepository, StaffUserService, StaffUserRepository],
})
export class UserModule {}
