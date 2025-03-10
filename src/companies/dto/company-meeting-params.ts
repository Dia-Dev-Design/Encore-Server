import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { PaginationParams } from '../../types/pagination';
import { IsString, IsOptional } from 'class-validator';
import { CompanyMeetingSortOptions } from '../enums/companies-sort.enum';
import { SortOrderEnum } from 'src/utils/enums/utils.enums';

export class CompanyMeetingParamsDto extends IntersectionType(
  PaginationParams,
) {
  //sort
  @ApiProperty({
    description: `Sort by ${Object.values(CompanyMeetingSortOptions)}`,
    default: CompanyMeetingSortOptions.date,
    example: CompanyMeetingSortOptions.date,
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOption: CompanyMeetingSortOptions;

  @ApiProperty({
    description: `Sort by order ${Object.values(SortOrderEnum)}`,
    default: SortOrderEnum.desc,
    example: SortOrderEnum.desc,
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder: SortOrderEnum;
}
