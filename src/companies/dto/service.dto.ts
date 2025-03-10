import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CompanyServicesEnum } from '../enums/comapanies.enum';

export class ServiceDto {
  @ApiProperty({
    enum: CompanyServicesEnum,
    example: CompanyServicesEnum.DISSOLUTION,
  })
  @IsNotEmpty()
  @IsEnum(CompanyServicesEnum)
  name: CompanyServicesEnum;

  @ApiProperty({
    example: true,
  })
  @IsNotEmpty()
  enabled: boolean;
}
