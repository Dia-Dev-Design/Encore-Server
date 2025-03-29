import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpException,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from 'src/auth/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { DocHubService } from '../services/dochub.service';
import { S3Service } from 'src/s3/s3.service';
import { CompaniesService } from 'src/companies/companies.service';
import { FileType } from '@prisma/client';
import { Response } from 'express';
import { Public } from 'src/auth/decorators/public.decorator';
import { Request } from 'express';
import { StaffJwtAuthGuard } from 'src/auth/staff-auth.guard';
import { StaffAuth } from 'src/auth/decorators/staff-auth.decorator';

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

  @Post('upload/multiple')
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files'))
  @ApiResponse({
    status: 200,
    description: 'Multiple documents successfully uploaded and processed',
  })
  async uploadMultipleDocuments(
    @UploadedFiles() files: Express.Multer.File[],
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

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const fileReference = await this.s3Service.uploadFile(
              file,
              FileType.AI,
              {
                userId: user.id,
                rootFolderId: rootFolderId,
              },
            );

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
            return {
              success: false,
              fileName: file.originalname,
              error: error.message,
            };
          }
        }),
      );

      const successCount = results.filter((result) => result.success).length;
      const failureCount = results.length - successCount;

      return {
        totalProcessed: results.length,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      throw new HttpException(
        `Error uploading documents: ${error.message}`,
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

  @Get('documents/with-urls')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user documents with signed URLs',
  })
  async getUserDocumentsWithUrls(
    @User() user: UserEntity,
    @Req() req: Request, // Use @Req() instead of @Request()
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '8',
  ) {
    // Log the user object
    console.log('User object from token:', req.user);

    // Log specific user properties
    console.log('User ID:', user.id);

    // Get the raw token if needed
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      // Decode the JWT to see its payload
      const decodedToken = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      console.log('Decoded JWT payload:', decodedToken);
    }

    return this.docHubService.getUserDocumentsWithUrls(
      user.id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('documents/user/:userId/with-urls')
  @UseGuards(StaffJwtAuthGuard)
  @ApiBearerAuth()
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user documents with signed URLs by user ID',
  })
  async getUserDocumentsWithUrlsByUserId(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '8',
  ) {
    return this.docHubService.getUserDocumentsWithUrls(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('documents/:id/stream')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Successfully streamed document',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getUserDocument(@Param('id') documentId: string, @Res() res: Response) {
    return this.docHubService.getUserDocument(documentId, res);
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

  @Get('assigned-users/:lawyerId')
  @UseGuards(StaffJwtAuthGuard)
  @ApiBearerAuth()
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description: 'User IDs fetched successfully',
    type: Array,
  })
  async getUsersByLawyer(@Param('lawyerId') lawyerId: string, @Req() req: Request) {
    return this.docHubService.getUsersByLawyer(lawyerId);
  }

}
