import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { S3Module } from '../s3/s3.module'; // Import the S3Module

@Module({
  imports: [S3Module],
  providers: [FilesService],
  controllers: [FilesController],
})
export class FilesModule {}
