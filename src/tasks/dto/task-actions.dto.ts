import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { TaskTypeEnum } from '../enums/task.enum';

export class UptadeTaskDto {
  @ApiProperty({
    description: `strings ids`,
    required: true,
  })
  @IsNotEmpty()
  ids: string[];
}

export class AssignTaskDto {
  @ApiProperty({
    description: `strings ids for the tasks`,
    required: true,
  })
  @IsNotEmpty()
  ids: string[];

  @ApiProperty({
    description: `strings id for the user`,
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: `type of assign ${Object.values(TaskTypeEnum)}`,
    required: true,
  })
  @IsNotEmpty()
  taskType: TaskTypeEnum;
}
