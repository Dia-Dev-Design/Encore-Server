import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from 'src/auth/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { DocHubService } from '../services/dochub.service';
import { S3Service } from 'src/s3/s3.service';
import { CompaniesService } from 'src/companies/companies.service';
import { FileType } from '@prisma/client';

@ApiTags('DocHub')
@Controller('dochub')
export class DocHubController {
  constructor(
    private readonly docHubService: DocHubService,
    private readonly s3Service: S3Service,
    private readonly companyService: CompaniesService,
  ) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({
    status: 200,
    description: 'Document successfully uploaded and processed',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserEntity,
  ) {
    try {
      const userCompany = await this.companyService.getUserCompany(user.id);
      if (!userCompany) {
        throw new HttpException(
          'User is not associated with any company',
          HttpStatus.BAD_REQUEST,
        );
      }

      const company = await this.companyService.getCompanyById(
        userCompany.companyId,
      );

      let rootFolderId = company.rootFolderId;
      if (!rootFolderId) {
        rootFolderId = await this.companyService.ensureCompanyRootFolder(
          company.id,
        );
      }

      const fileReference = await this.s3Service.uploadFile(file, FileType.AI, {
        userId: user.id,
        rootFolderId: rootFolderId,
      });

      await this.docHubService.processDocument(
        file.buffer,
        fileReference.id,
        user.id,
      );

      return {
        success: true,
        fileId: fileReference.id,
        fileName: fileReference.originalName,
      };
    } catch (error) {
      throw new HttpException(
        `Error uploading document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('documents')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user documents',
  })
  async getUserDocuments(@User() user: UserEntity) {
    return this.docHubService.getUserDocuments(user.id);
  }

  @Delete('documents/:id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Document successfully deleted',
  })
  async deleteDocument(
    @Param('id') documentId: string,
    @User() user: UserEntity,
  ) {
    return this.docHubService.deleteUserDocument(user.id, documentId);
  }
}
