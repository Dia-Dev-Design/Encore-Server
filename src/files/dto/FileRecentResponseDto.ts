import { FileReference, ProductEnum } from '@prisma/client';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

export class FileItemDto {
  @ApiProperty({
    description: 'Unique identifier of the file',
    example: 'e77f7c4d-6f9e-4c47-8d5d-3c461f9c794a',
  })
  id: string;

  @ApiProperty({
    description: 'Key, same as the id',
    example: 'e77f7c4d-6f9e-4c47-8d5d-3c461f9c794a',
  })
  key: string;

  @ApiProperty({
    description: 'Name of the file',
    example: 'employment_agreement_2024.pdf',
  })
  name: string;

  @ApiProperty({
    description: 'Product type the file belongs to',
    enum: ProductEnum,
    example: ProductEnum.CHATBOT,
  })
  product: ProductEnum;

  @ApiProperty({
    description: 'Associated task description or chat name',
    example: 'Long Task name description',
  })
  taskOrChat: string;

  @ApiProperty({
    description: 'Owner of the file (User or Staff name)',
    example: 'John Doe',
    nullable: true,
  })
  owner: string;

  @ApiProperty({
    description: 'Date when the file was uploaded',
    example: '2024-01-10T12:00:00Z',
  })
  uploadDate: Date;

  @ApiProperty({
    description: 'Location/folder where the file is stored',
    example: 'Employment Agreement',
    nullable: true,
  })
  location: string;

  @ApiProperty({
    description: 'Download URL for the file',
    example: 'https://my-bucket.s3.amazonaws.com/files/document.pdf',
  })
  downloadUrl: string;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Total number of items available',
    example: 15,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;
}

export class FileRecentResponseDto {
  @ApiProperty({
    description: 'Array of file items',
    type: [FileItemDto],
    example: [
      {
        id: 'e77f7c4d-6f9e-4c47-8d5d-3c461f9c794a',
        name: 'employment_agreement_2024.pdf',
        product: 'CHATBOT',
        taskOrChat: 'Chat name',
        owner: 'Client',
        uploadDate: '2024-01-10T12:00:00Z',
        location: 'Employment Agreement',
      },
      {
        id: 'a98b7c4d-6f9e-4c47-8d5d-3c461f9c794b',
        name: 'dissolution_document.pdf',
        product: 'DISSOLUTION',
        taskOrChat: 'Long Task name description',
        owner: 'Encore',
        uploadDate: '2024-01-10T11:00:00Z',
        location: 'Organizational documents',
      },
    ],
  })
  data: FileItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
