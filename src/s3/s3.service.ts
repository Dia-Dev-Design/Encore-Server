import { Injectable } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FileReference, FileType, ProductEnum } from '@prisma/client';

@Injectable()
export class S3Service {
  private readonly s3: S3;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.s3 = new S3({
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKeyId'),
        secretAccessKey: this.configService.get<string>('s3.secretAccessKey'),
      },

      region: this.configService.get<string>('s3.region'),
    });

    this.bucketName = this.configService.get<string>('s3.bucketName');
  }

  async uploadFile(
    file: Express.Multer.File,
    fileType: FileType,
    params?: {
      userId?: string;
      staffId?: string;
      threadId?: string;
      rootFolderId?: string;
    },
  ): Promise<FileReference> {
    const s3Params = {
      Bucket: this.bucketName,
      Key: `${Date.now()}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const uploadResult = await new Upload({
      client: this.s3,
      params: s3Params,
    }).done();

    const fileData: any = {
      key: s3Params.Key,
      originalName: file.originalname,
      url: uploadResult.Location,
      mimeType: file.mimetype,
      size: file.size,
      fileType: fileType,
    };

    if (params?.rootFolderId) {
      fileData.FolderFileReference = {
        create: {
          userId: params.userId,
          staffId: params.staffId,
          product: ProductEnum.CHATBOT,
          folderId: params.rootFolderId,
        },
      };
    }

    return this.prisma.fileReference.create({
      data: fileData,
    });
  }

  async getFileUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 60,
    };

    return getSignedUrl(this.s3, new GetObjectCommand(params), {
      expiresIn: 60,
    });
  }

  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    await this.s3.deleteObject(params);
  }

  async getSignedUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 3600, // URL expires in 1 hour
    };

    return getSignedUrl(this.s3, new GetObjectCommand(params), {
      expiresIn: 3600,
    });
  }

  async getSignedUrls(keys: string[]): Promise<string[]> {
    const signedUrls = await Promise.all(
      keys.map(async (key) => {
        const params = {
          Bucket: this.bucketName,
          Key: key,
          Expires: 3600, // URL expires in 1 hour
        };

        return getSignedUrl(this.s3, new GetObjectCommand(params), {
          expiresIn: 3600,
        });
      }),
    );

    return signedUrls;
  }
}
