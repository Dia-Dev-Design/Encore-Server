import { Module } from '@nestjs/common';
import { DocHubController } from './controllers/dochub.controller';
import { DocHubService } from './services/dochub.service';
import { S3Module } from 'src/s3/s3.module';
import { CompaniesModule } from 'src/companies/companies.module';

@Module({
  imports: [S3Module, CompaniesModule],
  controllers: [DocHubController],
  providers: [DocHubService],
  exports: [DocHubService],
})
export class DocHubModule {}
