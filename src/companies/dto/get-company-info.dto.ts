import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsISO31661Alpha2,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { StateIsoCode } from 'src/registration/dto/step1.dto';
import { CompanyServicesEnum, GetAllTabEnum } from '../enums/comapanies.enum';
import { ServiceDto } from './service.dto';

export class BasicCompanyInfoDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(GetAllTabEnum)
  type: GetAllTabEnum;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contactName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  emailAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber(null)
  phone: string;

  @ApiProperty({
    example: {
      id: '1',
      name: 'Agriculture',
    },
  })
  @IsNotEmpty()
  industryType: {
    id: string;
    name: string;
  };

  @ApiProperty({ type: [String], example: ['TX', 'FL', 'CA'] })
  states: StateIsoCode[];

  @ApiProperty({
    type: [String],
    format: 'iso3166-1-alpha-2',
    example: ['US', 'CA'],
  })
  @IsArray()
  @IsISO31661Alpha2({ each: true })
  otherCountries?: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currentStage: string;

  @ApiProperty({
    type: [ServiceDto],
    description:
      'List of services associated with the company, indicating the service name and whether it is enabled.',
    example: [
      { name: CompanyServicesEnum.DISSOLUTION, enabled: true },
      { name: CompanyServicesEnum.AI_CHATBOT, enabled: false },
    ],
  })
  @IsNotEmpty()
  services: ServiceDto[];

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  rootFolderId: string;
}
