import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationParams } from 'src/types/pagination';

export class FileFilterParamsDto extends IntersectionType(PaginationParams) {
  @ApiProperty({
    description: 'Name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Created At',
  })
  @IsOptional()
  @IsString()
  createdAt?: string;
}
