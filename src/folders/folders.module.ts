import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FoldersRepository } from './folders.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileRepository } from 'src/files/file.repository';
import { FilesModule } from 'src/files/files.module';
import { S3Module } from 'src/s3/s3.module';
@Module({
  imports: [FilesModule, S3Module],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersRepository, PrismaService, FileRepository],
  exports: [FoldersService, FoldersRepository],
})
export class FoldersModule {}
