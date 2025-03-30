import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { CompaniesModule } from 'src/companies/companies.module';
import { UserModule } from 'src/user/user.module';
import { IndustriesModule } from 'src/industries/industries.module';

@Module({
  imports: [CompaniesModule, UserModule, IndustriesModule],
  providers: [RegistrationService],
  controllers: [RegistrationController],
})
export class RegistrationModule {}
