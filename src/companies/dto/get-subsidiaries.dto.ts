import { IsNotEmpty, IsString } from 'class-validator';

export class SubsidiaryDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}
