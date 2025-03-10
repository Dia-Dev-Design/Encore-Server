import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { CurrentStage, CompanyStructure } from '@prisma/client';
import { IntersectionType, ApiProperty } from '@nestjs/swagger';
import { PaginationParams } from '../../types/pagination';
import { Type } from 'class-transformer';
import {
  CompanyStageEnum,
  CompanyStatusEnum,
  GetAllTabEnum,
} from '../enums/comapanies.enum';
import { CompanySortOptions } from '../enums/companies-sort.enum';
import { SortOrderEnum } from '../../utils/enums/utils.enums';
import { HasReqChatbotLawyerEnum } from '../../chatbot/enums/chatbot.enum';

export class CompanyFilterParamsDto extends IntersectionType(PaginationParams) {
  @ApiProperty({
    description: 'Unique identifier for filtering a specific company',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Filter companies by their table type/category',
    enum: GetAllTabEnum,
    example: GetAllTabEnum.PROSPECT,
    required: true,
    default: GetAllTabEnum.PROSPECT,
  })
  @IsNotEmpty()
  @IsEnum(GetAllTabEnum)
  tableType?: GetAllTabEnum;

  @ApiProperty({
    description: 'Filter companies by industry sector',
    example: 'tech-industry-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  industryId?: string;

  @ApiProperty({
    description: 'Search term to filter companies by name or assigned users',
    example: 'Tech Corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter companies by exact name match',
    example: 'Tech Innovations Inc.',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Filter subsidiaries by parent company ID',
    example: 'parent-c123e4567-e89b-12d3-a456',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentCompanyId?: string;

  @ApiProperty({
    description: 'Filter companies by setup completion status',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasCompletedSetup?: boolean;

  @ApiProperty({
    description: 'Indicates if the company has been evaluated',
    example: false,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasBeenEvaluated?: boolean;

  @ApiProperty({
    description: 'Indicates if the company has raised capital',
    example: false,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasRaisedCapital?: boolean;

  @ApiProperty({
    description: 'Indicates if the company has W2 employees',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasW2Employees?: boolean;

  @ApiProperty({
    description: 'Current stage in the company lifecycle',
    enum: CompanyStageEnum,
    example: CompanyStageEnum.ENGAGE_WITH_ENCORE_AND_IP_TRANSFER,
    required: false,
  })
  @IsOptional()
  @IsEnum(CompanyStageEnum)
  currentStage?: CompanyStageEnum;

  @ApiProperty({
    description: 'Current status of the company',
    enum: CompanyStatusEnum,
    example: CompanyStatusEnum.PARTIAL_UNWIND,
    required: false,
  })
  @IsOptional()
  @IsEnum(CompanyStatusEnum)
  status?: CompanyStatusEnum;

  @ApiProperty({
    description: 'Other stage of the company',
    example: 'Seed',
    required: false,
  })
  @IsOptional()
  @IsString()
  otherStage?: string;

  @ApiProperty({
    description: 'Other structure of the company',
    example: 'LLC',
    required: false,
  })
  @IsOptional()
  @IsString()
  otherStructure?: string;

  @ApiProperty({
    description: 'Structure of the company',
    required: false,
  })
  @IsOptional()
  @IsEnum(CompanyStructure)
  structure?: CompanyStructure;

  @ApiProperty({
    description: 'filter lawyer req status in chatbot-list',
    required: false,
  })
  @IsOptional()
  @IsEnum(HasReqChatbotLawyerEnum)
  hasReqChatbotLawyer: HasReqChatbotLawyerEnum;

  @ApiProperty({
    description: 'Creation date of the company record',
    required: false,
  })
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @ApiProperty({
    description: 'Last updated date of the company record',
    required: false,
  })
  @IsOptional()
  updatedAt?: Date;

  @ApiProperty({
    description: 'Sort results by specific company attributes',
    enum: CompanySortOptions,
    default: CompanySortOptions.createdAt,
    example: CompanySortOptions.createdAt,
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOption: CompanySortOptions;

  @ApiProperty({
    description: 'Sort order direction (ascending or descending)',
    enum: SortOrderEnum,
    default: SortOrderEnum.desc,
    example: SortOrderEnum.desc,
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder: SortOrderEnum;
}
