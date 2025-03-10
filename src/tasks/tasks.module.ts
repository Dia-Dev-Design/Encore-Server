import { Module } from '@nestjs/common';
import { TasksController } from './controllers/tasks.controller';

import { TasksService } from './services/tasks.service';
import { TasksRepository } from './repository/task.repository';

@Module({
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksRepository, TasksService],
})
export class TasksModule {}
