import { IsString, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteUserRegistrationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  @ApiProperty()
  phone: string;
}
