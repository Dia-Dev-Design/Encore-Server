import { CurrentStage } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class Step3Dto {
  @ApiProperty({
    description: "Current stage in the company's lifecycle",
    enum: CurrentStage,
    enumName: 'CurrentStage',
    example: 'MIDDLE_OF_SHUTDOWN',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  currentStage: CurrentStage;
}
