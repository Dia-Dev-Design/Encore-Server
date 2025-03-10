import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { CompanyServicesEnum } from '../enums/comapanies.enum';

export class ReassignCompaniesDto {
  @ApiProperty({
    description: 'Array of company IDs to reassign',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  companyIds: string[];

  @ApiProperty({
    description: 'ID of the staff user to assign the companies to',
  })
  @IsNotEmpty()
  @IsString()
  staffUserId: string;
}

export class ChangeCompanyClientTypeDto {
  @ApiProperty({
    description: 'Array of company IDs to reassign',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  companyIds: string[];

  @ApiProperty({
    description: `Type of service ${Object.values(CompanyServicesEnum)}`,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  serviceType: CompanyServicesEnum;
}
