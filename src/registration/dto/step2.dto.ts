import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO31661Alpha2,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { StateIsoCode } from './step1.dto';
import { CompanyStructureEnum } from '../../companies/enums/comapanies.enum';

export class Step2Dto {
  @ApiProperty({
    description: 'Legal structure of the company',
    enum: CompanyStructureEnum,
    example: CompanyStructureEnum.LLC,
    required: true,
  })
  @IsString()
  structure: CompanyStructureEnum;

  @ApiProperty({
    description:
      'Indicates if the company has raised capital through investments',
    example: true,
    required: true,
  })
  @IsBoolean()
  hasRaisedCapital: boolean;

  @ApiProperty({
    description: 'Indicates if the company has W-2 employees',
    example: true,
    required: true,
  })
  @IsBoolean()
  hasW2Employees: boolean;

  @ApiProperty({
    description: 'List of US states where the company has employees',
    enum: StateIsoCode,
    enumName: 'StateIsoCode',
    isArray: true,
    example: [StateIsoCode.CA, StateIsoCode.NY],
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.employeesStates !== undefined)
  @IsArray()
  @IsEnum(StateIsoCode, { each: true })
  employeesStates?: StateIsoCode[];

  @ApiProperty({
    description:
      'List of countries where the company has employees (ISO 3166-1 alpha-2 codes)',
    example: ['US', 'CA', 'GB'],
    type: [String],
    format: 'iso3166-1-alpha-2',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.employeesCountries !== undefined)
  @IsArray()
  @IsISO31661Alpha2({ each: true })
  @IsNotEmpty({ each: true })
  employeesCountries?: string[];
}
