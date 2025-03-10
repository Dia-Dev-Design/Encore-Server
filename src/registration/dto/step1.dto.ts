import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  IsUUID,
  IsISO31661Alpha2,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export enum StateIsoCode {
  AL = 'US-AL', // Alabama
  AK = 'US-AK', // Alaska
  AZ = 'US-AZ', // Arizona
  AR = 'US-AR', // Arkansas
  CA = 'US-CA', // California
  CO = 'US-CO', // Colorado
  CT = 'US-CT', // Connecticut
  DE = 'US-DE', // Delaware
  FL = 'US-FL', // Florida
  GA = 'US-GA', // Georgia
  HI = 'US-HI', // Hawaii
  ID = 'US-ID', // Idaho
  IL = 'US-IL', // Illinois
  IN = 'US-IN', // Indiana
  IA = 'US-IA', // Iowa
  KS = 'US-KS', // Kansas
  KY = 'US-KY', // Kentucky
  LA = 'US-LA', // Louisiana
  ME = 'US-ME', // Maine
  MD = 'US-MD', // Maryland
  MA = 'US-MA', // Massachusetts
  MI = 'US-MI', // Michigan
  MN = 'US-MN', // Minnesota
  MS = 'US-MS', // Mississippi
  MO = 'US-MO', // Missouri
  MT = 'US-MT', // Montana
  NE = 'US-NE', // Nebraska
  NV = 'US-NV', // Nevada
  NH = 'US-NH', // New Hampshire
  NJ = 'US-NJ', // New Jersey
  NM = 'US-NM', // New Mexico
  NY = 'US-NY', // New York
  NC = 'US-NC', // North Carolina
  ND = 'US-ND', // North Dakota
  OH = 'US-OH', // Ohio
  OK = 'US-OK', // Oklahoma
  OR = 'US-OR', // Oregon
  PA = 'US-PA', // Pennsylvania
  RI = 'US-RI', // Rhode Island
  SC = 'US-SC', // South Carolina
  SD = 'US-SD', // South Dakota
  TN = 'US-TN', // Tennessee
  TX = 'US-TX', // Texas
  UT = 'US-UT', // Utah
  VT = 'US-VT', // Vermont
  VA = 'US-VA', // Virginia
  WA = 'US-WA', // Washington
  WV = 'US-WV', // West Virginia
  WI = 'US-WI', // Wisconsin
  WY = 'US-WY', // Wyoming
  // Territories
  AS = 'US-AS', // American Samoa
  GU = 'US-GU', // Guam
  MP = 'US-MP', // Northern Mariana Islands
  PR = 'US-PR', // Puerto Rico
  VI = 'US-VI', // U.S. Virgin Islands
  UM = 'US-UM', // United States Minor Outlying Islands
}

export class Step1Dto {
  @ApiProperty({
    description: 'Full name of the company representative',
    example: 'John Smith',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({
    description: 'Contact phone number in E.164 format',
    example: '+1234567890',
    required: true,
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Legal name of the company',
    example: 'Tech Innovations Inc.',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: "Unique identifier for the company's industry sector",
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  industryId: string;

  @ApiProperty({
    description:
      'List of countries where the company operates (ISO 3166-1 alpha-2 codes)',
    example: ['US', 'CA', 'GB'],
    type: [String],
    format: 'iso3166-1-alpha-2',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.otherCountries !== undefined)
  @IsArray()
  @IsISO31661Alpha2({ each: true })
  otherCountries?: string[];

  @ApiProperty({
    description: 'List of US states where the company operates',
    enum: StateIsoCode,
    enumName: 'StateIsoCode',
    isArray: true,
    example: [StateIsoCode.CA, StateIsoCode.NY, StateIsoCode.TX],
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(StateIsoCode, { each: true })
  states: StateIsoCode[];
}
