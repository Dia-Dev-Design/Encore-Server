import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../auth/decorators/public.decorator';

import { TasksFilterParamsDto } from '../dto/task-cms-filter.dto';

import { TasksService } from '../services/tasks.service';
import { AssignTaskDto, UptadeTaskDto } from '../dto/task-actions.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('create-for-company/:companyId')
  @Public()
  async createTaskForCompany(@Param('companyId') companyId: string) {
    return await this.tasksService.createTasks(companyId);
  }

  @ApiOperation({ summary: 'dissolution roadMap' })
  @Get('dissolution-roadmap-old/:companyId')
  @Public()
  async getDissolutionMapold(@Param('companyId') companyId: string) {
    return await this.tasksService.getDissolutionMap(companyId);
  }

  @ApiOperation({ summary: 'dissolution roadMap' })
  @Get('dissolution-roadmap/:companyId')
  @Public()
  async getDissolutionMap(@Param('companyId') companyId: string) {
    return await this.tasksService.getDissolutionMapList(companyId);
  }

  @ApiOperation({ summary: 'List of task with pagination metadata. for cms' })
  @Get('list')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'List of task with pagination metadata',
    //type: [CompanyEntity],
  })
  getTaskList(@Query() query: TasksFilterParamsDto) {
    const { limit, page, ...filters } = query;
    return this.tasksService.listTasks({ limit, page }, filters);
  }

  @ApiOperation({ summary: 'delete tasks, by ids' })
  @Delete()
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Tasks deleted successfully',
    //type: [CompanyEntity],
  })
  async deleteTasks(@Body() payload: UptadeTaskDto) {
    await this.tasksService.deleteTask(payload);
  }

  @ApiOperation({ summary: 'Mark tasks as complete status, by ids' })
  @Post('complete')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
  })
  async CompleteTasks(@Body() payload: UptadeTaskDto) {
    await this.tasksService.completeTask(payload);
  }

  @ApiOperation({ summary: 'Assign tasks' })
  @Post('assign')
  @ApiBody({ type: AssignTaskDto })
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
    //type: [CompanyEntity],
  })
  async AssignTasks(@Body() payload: AssignTaskDto) {
    await this.tasksService.assignTasks(payload);
  }
}
