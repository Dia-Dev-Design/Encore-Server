import { CurrentStage, CompanyStructure } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStructureEnum } from '../enums/comapanies.enum';
export class CompanyEntity {
  @ApiProperty({ description: 'Unique identifier for the company' })
  id: string;

  @ApiProperty({ description: 'Identifier for the associated industry' })
  industryId: string;

  @ApiProperty({ description: 'Name of the company' })
  name: string;

  @ApiPropertyOptional({
    description: 'Identifier for the parent company, if applicable',
  })
  parentCompanyId?: string;

  @ApiProperty({
    description: 'Indicates whether the company has completed its setup',
    default: false,
  })
  hasCompletedSetup: boolean = false;

  @ApiPropertyOptional({
    description: 'Indicates whether the company has raised capital',
  })
  hasRaisedCapital?: boolean;

  @ApiPropertyOptional({
    description: 'Indicates whether the company has W-2 employees',
  })
  hasW2Employees?: boolean;

  @ApiPropertyOptional({
    description: 'Current stage of the company',
    enum: CurrentStage,
  })
  currentStage?: CurrentStage;

  @ApiPropertyOptional({
    description:
      'Additional information about the current stage, if applicable',
  })
  otherStage?: string;

  @ApiPropertyOptional({
    description:
      'Additional information about the company structure, if applicable',
  })
  otherStructure?: string;

  @ApiPropertyOptional({
    description: 'Structure of the company',
    enum: CompanyStructureEnum,
  })
  structure?: CompanyStructureEnum;

  @ApiProperty({
    description:
      'Indicates if the company has been evaluated during intake call',
    default: false,
  })
  hasBeenEvaluated: boolean = false;

  @ApiProperty({
    description: 'Timestamp indicating when the company was created',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp indicating when the company was last updated',
  })
  updatedAt: Date;

  constructor(partial: Partial<CompanyEntity>) {
    Object.assign(this, partial);
  }
}
