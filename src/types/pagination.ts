import { ApiProperty } from '@nestjs/swagger';
import { Max, Min, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationParams {
  @ApiProperty({
    description: 'Items per page',
    example: 3,
    required: false,
    minimum: 0,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(50)
  limit?: number;

  @ApiProperty({
    description: 'Page',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;
}

export class PaginationResponse {
  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
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

  @ApiProperty({
    description: 'Number of items to skip',
    example: 0,
  })
  offset: number;
}
