import { IsNotEmpty, IsString, IsDate } from 'class-validator';

export class CreateFollowUpDto {
  @IsNotEmpty()
  @IsDate()
  date: Date;

  @IsString()
  joinUrl?: string;
}
