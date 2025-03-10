import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationParams } from 'src/types/pagination';

export class FolderFilterParamsDto extends IntersectionType(PaginationParams) {
  @ApiProperty({
    description: 'Name',
    example: 'folder 1',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Created At',
    example: '2021-01-01',
  })
  @IsOptional()
  @IsString()
  createdAt?: string;
}
