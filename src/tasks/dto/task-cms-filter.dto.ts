import { IsOptional, IsString, IsNotEmpty, IsDate } from 'class-validator';
import { IntersectionType, ApiProperty } from '@nestjs/swagger';
import { PaginationParams } from '../../types/pagination';
import {
  TaskCategoryEnum,
  TaskStatusEnum,
  TaskTypeEnum,
} from '../enums/task.enum';
import { TaskSortOptions } from '../enums/sort.enum';
import { SortOrderEnum } from '../../utils/enums/utils.enums';

export class TasksFilterParamsDto extends IntersectionType(PaginationParams) {
  @ApiProperty({
    description: `Type of task: ${Object.values(TaskTypeEnum)}`,
    example: 'encore_task',
    required: true,
    default: 'encore_task',
  })
  @IsNotEmpty()
  @IsString()
  typeTask?: TaskTypeEnum;

  @ApiProperty({
    description: `Status of task: ${Object.values(TaskStatusEnum)}`,
    example: 'complete',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: `companyId`,
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    description: `Category of task: ${Object.values(TaskCategoryEnum)}`,
    example: TaskCategoryEnum.disolution,
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    //description: ``,
    required: false,
  })
  @IsOptional()
  @IsString()
  companyName: string;

  //sort
  @ApiProperty({
    description: `Sort by ${Object.values(TaskSortOptions)}`,
    default: TaskSortOptions.createdAt,
    example: TaskSortOptions.createdAt,
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOption: TaskSortOptions;

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
