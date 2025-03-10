import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { FileReference, FileType } from '@prisma/client';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
  ): Promise<FileReference> {
    try {
      const fileReference = await this.s3Service.uploadFile(file, fileType);
      return fileReference;
    } catch (error) {
      throw new HttpException(
        `Error uploading file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(id: string): Promise<FileReference> {
    try {
      const file = await this.prisma.fileReference.findUnique({
        where: { id },
      });
      if (!file) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      await this.s3Service.deleteFile(file.key);
      return this.prisma.fileReference.delete({ where: { id } });
    } catch (error) {
      throw new HttpException(
        `Error deleting file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async renameFile(id: string, newName: string): Promise<FileReference> {
    try {
      return await this.prisma.fileReference.update({
        where: { id },
        data: { originalName: newName },
      });
    } catch (error) {
      throw new HttpException(
        `Error renaming file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
