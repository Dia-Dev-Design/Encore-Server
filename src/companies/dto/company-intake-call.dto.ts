import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  CompanyIntellectualPropertyTypeEnum,
  CompanyStructureEnum,
} from '../enums/comapanies.enum';

export class IntellectualPropertyDto {
  type: CompanyIntellectualPropertyTypeEnum;

  registrationNumber: string;

  jurisdiction: string;
}
export class CompanyIntakeCallDto {
  //A. Company Structure and Ownership
  @ApiProperty({
    description: 'String structure of the company',
    example: 'LLC',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  structure: CompanyStructureEnum;

  @ApiProperty({
    description: 'String structure of the company',
    example: 'other value',
    required: false,
  })
  @IsString()
  @IsOptional()
  otherStructure: string;

  @ApiProperty({
    description: 'Indicates if the company has raised capital',
    example: false,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasRaisedCapital: boolean = false;

  // - w2 employees
  @ApiProperty({
    description: 'Indicates if the company has W2 employees',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasW2Employees: boolean = false;

  @ApiProperty({
    description: 'state for the W2 employees',
    example: 'US-FL',
    required: false,
  })
  @IsString()
  @IsOptional()
  stateW2Employees?: string;

  @ApiProperty({
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasSubsidiaries: boolean = false;

  //B. Intellectual Property

  // - outside operation
  @ApiProperty({
    description:
      'Indicates if the company have employees or operations outside the U.S',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasOperationOutsideUS: boolean = false;

  @ApiProperty({
    description: 'country for operations outside the U.S',
    example: 'KR',
    required: false,
  })
  @IsString()
  @IsOptional()
  countryOperationOutsideUS?: string;

  // - intellectual operation
  @ApiProperty({
    description: 'Indicates if the company has intellectual property',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasIntellectualProperty: boolean = false;

  @ApiProperty({
    description: 'Data for intellectual property',
    example: [
      { type: 'PATENTS', registrationNumber: '123', jurisdiction: 'abc' },
    ],
    required: false,
  })
  //@IsString()
  @IsOptional()
  @Type(() => IntellectualPropertyDto)
  intellectualProperty: IntellectualPropertyDto[] = [];

  // - pending IP application
  @ApiProperty({
    description: 'Indicates if theres any pending IP applications',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasPendingIPApplication: boolean = false;

  @ApiProperty({
    description: 'Details for pending IP Application',
    required: false,
  })
  @IsString()
  @IsOptional()
  pendingIPApplicationDetails?: string;

  //C. Employees & contractors
  @ApiProperty({
    example: true,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  areEmployeesInBargainingAgreements?: boolean = false;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  employeesInBargainingAgreementsDetails?: string;

  //D. Real Estate and Equipment

  @ApiProperty({
    example: true,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasEstatePropertyOrEquipment: boolean = false;

  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  estatePropertyOrEquipmentDetails?: string;

  //E. Financials

  // -  Financial obligation
  @ApiProperty({
    description: 'Indicates if theres is any financial obligations',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasFinancialObligations: boolean = false;

  @ApiProperty({
    description: 'Details for financial obligations',
    required: false,
  })
  @IsString()
  @IsOptional()
  finalcianObligationsDetails?: string;

  // - intent to have an asset sale
  @ApiProperty({
    description: 'Indicates if the company intend to have an asset sale',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasIntendToHaveAsset: boolean = false;

  @ApiProperty({
    description: 'Details for asset sale',
    required: false,
  })
  @IsString()
  @IsOptional()
  intendToHaveAssetDetails?: string;

  // - ongoing negotiations for
  @ApiProperty({
    description: 'Indicates if the company has an ongoing sale',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasOngoingNegotationsForSale: boolean = false;

  @ApiProperty({
    description: 'Details for ongoing sale',
    required: false,
  })
  @IsString()
  @IsOptional()
  ongoingNegotationsForSaleDetails?: string;

  //offer
  @ApiProperty({
    description: 'Indicates if the company has an offert',
    example: true,
    required: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsNotEmpty()
  hasReceivedOffers: boolean = false;

  @ApiProperty({
    description: 'Details for offers',
    required: false,
  })
  @IsString()
  @IsOptional()
  hasReceivedOffersDetails?: string;
}

export class IntakeCallResDto {
  //A. Company Structure and Ownership

  structure: string;

  otherStructure: string;

  hasRaisedCapital: boolean;

  // - w2 employees

  hasW2Employees?: boolean;

  stateW2Employees?: string;

  hasSubsidiaries: boolean;
  //B. Intellectual Property

  // - outside operation

  hasOperationOutsideUS: boolean;

  countryOperationOutsideUS?: string;

  // - intellectual operation

  hasIntellectualProperty: boolean;

  intellectualProperty: IntellectualPropertyDto[] | any;

  // - pending IP application

  hasPendingIPApplication: boolean;

  pendingIPApplicationDetails?: string;

  //C. Employees & contractors

  areEmployeesInBargainingAgreements?: boolean;

  employeesInBargainingAgreementsDetails?: string;

  //D. Real Estate and Equipment

  hasEstatePropertyOrEquipment: boolean;

  estatePropertyOrEquipmentDetails?: string;

  //E. Financials

  // -  Financial obligation

  hasFinancialObligations: boolean;

  financialObligationsDetails: string;

  // - intent to have an asset sale

  hasIntendToHaveAsset: boolean;

  intendToHaveAssetDetails: string;

  // - ongoing negotiations for

  hasOngoingNegotationsForSale: boolean;

  ongoingNegotationsForSaleDetails: string;

  //offer

  hasReceivedOffers: boolean;

  hasReceivedOffersDetails: string;
}
