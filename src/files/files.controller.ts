import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Delete,
  Patch,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { FileReference, FileType } from '@prisma/client';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileType') fileType: string,
  ): Promise<FileReference> {
    const type = fileType.toUpperCase() as keyof typeof FileType;
    if (!Object.values(FileType).includes(type as FileType)) {
      throw new HttpException('Invalid file type', HttpStatus.BAD_REQUEST);
    }
    return this.filesService.uploadFile(file, type);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @Patch(':id/rename')
  async renameFile(@Param('id') id: string, @Body('newName') newName: string) {
    if (!newName) {
      throw new HttpException('New name is required', HttpStatus.BAD_REQUEST);
    }
    return this.filesService.renameFile(id, newName);
  }
}
