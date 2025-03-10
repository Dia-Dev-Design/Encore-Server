import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CompanyServicesEnum } from '../enums/comapanies.enum';

export class ActivateDeactivateServiceDto {
  @ApiProperty({
    enum: CompanyServicesEnum,
    example: CompanyServicesEnum.DISSOLUTION,
  })
  @IsNotEmpty()
  @IsEnum(CompanyServicesEnum)
  service: CompanyServicesEnum;

  @ApiProperty({
    example: true,
  })
  @IsNotEmpty()
  enabled: boolean;
}
