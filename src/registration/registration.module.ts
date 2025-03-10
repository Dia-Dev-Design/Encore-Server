import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { CompaniesModule } from 'src/companies/companies.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [CompaniesModule, UserModule],
  providers: [RegistrationService],
  controllers: [RegistrationController],
})
export class RegistrationModule {}
