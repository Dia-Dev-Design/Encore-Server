import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskTypeEnum } from '../enums/task.enum';

@Injectable()
export class TasksRepository {
  private readonly logger = new Logger(TasksRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findLastTaskByCompanyId(companyId: string) {
    const task = await this.prisma.task.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    const taskRes = task
      ? {
          id: task.id,
          description: task.description,
        }
      : null;

    return taskRes;
  }

  async finsTasksByTaksIds(taskids: string[], typeTask: TaskTypeEnum) {
    try {
      return await this.prisma.task.findMany({
        where: { id: { in: taskids }, typeTask },
        select: { company: true },
      });
    } catch (error) {}
  }
}
