import { TaskStatusEnum, TaskTypeEnum } from '../enums/task.enum';

export class DissolutionMapTaskDto {
  id: string;
  taskPos: number;
  name: string;
  category: string;
  typeTask: TaskTypeEnum | string;
  status: TaskStatusEnum | string;
  isAssigned: boolean;
  adminAssigned: string | null;
  userAssigned: string | null;
  startDate: Date;
  endDate: Date;
  durationInDays: number;
  progress: number;
}

export class DissolutionMapStepDto {
  name: string;
  stepPos: number;
  startDate: Date;
  endDate: Date;
  durationInDays: number;
  progress: number;
  tasks: DissolutionMapTaskDto[];
}

export type DissolutionMapDto = DissolutionMapStepDto[];
