import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { _ } from 'lodash';

import { TasksFilterParamsDto } from '../dto/task-cms-filter.dto';
import { Prisma, Task } from '@prisma/client';

import { PrismaQueryBuilder } from '../../common/query/query-builder';
import { taskFilterConfig } from '../../common/query/task-filter-config';

import { PaginationParams, PaginationResponse } from '../../types/pagination';
import { calcPagination } from '../../utils/calc-pagination';

import { PrismaService } from '../../prisma/prisma.service';

import { TasksRepository } from '../repository/task.repository';

import {
  TaskCategoryEnum,
  TaskStatusEnum,
  TaskTypeEnum,
} from '../enums/task.enum';
import { AssignTaskDto, UptadeTaskDto } from '../dto/task-actions.dto';
import { TaskSortObject, TaskSortOptions } from '../enums/sort.enum';
import { SortOrderEnum } from '../../utils/enums/utils.enums';
import {
  DissolutionMapDto,
  DissolutionMapStepDto,
  DissolutionMapTaskDto,
} from '../dto/dissolution-map.dto';
import { v4 as uuidv4 } from 'uuid';
import { StaffUser } from '@prisma/client';
import { add, differenceInDays, endOfMonth, isSameDay, set } from 'date-fns';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskRepo: TasksRepository,
  ) {}

  async createTasks(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
    });
    const existingTasks = await this.prisma.task.findMany({
      where: { companyId, category: TaskCategoryEnum.disolution },
    });
    if (existingTasks.length > 0) {
      return;
    }

    const dissolutionSteps = await this.prisma.dissolutionFlowStep.findMany();

    //company info
    const companyIP = await this.prisma.companyIntellectualProperty.findFirst({
      where: { Company: { id: companyId } },
    });
    const companyFinancial =
      await this.prisma.companyFinancialDetails.findFirst({
        where: { Company: { id: companyId } },
      });

    const steps = [];

    let startDate = add(new Date(), { days: 2 });
    startDate = set(startDate, { hours: 0, minutes: 0, seconds: 0 });

    const dates = {};

    let endDate = null;
    for (const elem of dissolutionSteps) {
      if (elem.stepId === 4) {
        //check if company has intellectual property
        if (!companyIP) continue;
        if (!companyIP.intellectualProperty) continue;

        const start = dates[`2`].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }

      if (elem.stepId === 9) {
        //check if company has an asset for sale
        if (!companyFinancial) continue;
        if (!companyFinancial.intendToHaveAssetDetails) continue;

        const start = dates['3'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }

      if (elem.stepId === 10) {
        if (!companyFinancial) continue;
        if (
          !companyFinancial.intendToHaveAssetDetails ||
          !companyFinancial.hasReceivedOffersDetails
        )
          continue;

        const start = dates['9'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }

      if (elem.stepId === 11) {
        if (!companyFinancial) continue;
        if (
          !companyFinancial.intendToHaveAssetDetails ||
          !companyFinancial.ongoingNegotationsForSaleDetails
        )
          continue;

        const start = dates['9'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }

      if (elem.stepId === 12) {
        if (!companyFinancial) continue;
        if (!companyFinancial.financialObligationsDetails) continue;

        const start = dates['2'].dueDate;
        const init = add(start, { days: 1 });
        const end = add(init, { days: elem.durationDays });

        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: end,
        };
      }

      //calculate basic dates?
      if (elem.stepId === 1) {
        dates[elem.stepId.toString()] = {
          startDate: startDate,
          dueDate: add(startDate, { days: elem.durationDays }),
        };
      }
      if (
        elem.stepId === 2 ||
        elem.stepId === 3 ||
        elem.stepId === 7 ||
        elem.stepId === 8 ||
        elem.stepId === 17 ||
        elem.stepId === 21
      ) {
        const start = dates[`${elem.stepId - 1}`].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 5) {
        const start = dates['3'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 6 || elem.stepId === 13 || elem.stepId === 14) {
        const start = dates['2'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 15 || elem.stepId === 16 || elem.stepId === 22) {
        const start = dates['13'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 18) {
        const start = dates['14'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 19) {
        const start = dates['1'].startDate;
        //const init = add(start, { days: 1 });
        const init = start;
        const end = dates['8'].dueDate;
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(end, { days: -1 }),
        };
      }
      if (elem.stepId === 20) {
        const start = dates['8'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 23) {
        const start = dates['17'].dueDate;
        const init = add(start, { days: 1 });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: add(init, { days: elem.durationDays }),
        };
      }
      if (elem.stepId === 24) {
        const start = dates['7'].dueDate;
        const init = add(start, { days: 1 });

        let dueDate = endOfMonth(init);

        if (isSameDay(init, dueDate) || differenceInDays(dueDate, init) < 7) {
          dueDate = add(init, { days: 10 });
          dueDate = endOfMonth(init);
        }

        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate,
        };
      }
      if (elem.stepId === 25) {
        if (dates['11']) {
          const start = dates['11'].dueDate;
          const init = add(start, { days: 1 });
          dates[elem.stepId.toString()] = {
            startDate: init,
            dueDate: add(init, { days: elem.durationDays }),
          };
        } else {
          const start = dates['18'].dueDate;
          const init = add(start, { days: 1 });
          dates[elem.stepId.toString()] = {
            startDate: init,
            dueDate: add(init, { days: elem.durationDays }),
          };
        }
      }
      if (elem.stepId === 26) {
        const start = dates['25'].dueDate;
        const init = add(start, { days: 1 });
        endDate = add(init, { days: elem.durationDays });
        dates[elem.stepId.toString()] = {
          startDate: init,
          dueDate: endDate,
        };
      }

      steps.push(elem);
    }

    //extra set dates
    if (dates['12']) {
      dates['12'].dueDate = endDate;
    }

    dates['17'].dueDate = endDate;
    dates['21'].dueDate = endDate;

    //final define tasks (for each step)
    const taskData: Prisma.TaskCreateManyInput[] = [];

    for (const step of steps) {
      const actionTasks = step.tasks as Prisma.JsonArray;

      const responsibleParty = step.responsibleParty;
      let typeTask = TaskTypeEnum.client_task;
      if (responsibleParty.length === 1) {
        if (responsibleParty[0] === 'Encore') {
          typeTask = TaskTypeEnum.encore_task;
        }
      }
      for (const [i, task] of actionTasks.entries()) {
        const taskElem = task as Prisma.JsonObject;
        taskData.push({
          companyId,
          description: taskElem.name as string,
          stepName: step.stepName,
          status: TaskStatusEnum.pending,
          isAssigned: false,
          progress: 0,
          stepPosition: step.stepId,
          taskPosition: i + 1,
          category: TaskCategoryEnum.disolution,
          startDate: dates[step.stepId.toString()].startDate,
          dueDate: dates[step.stepId.toString()].dueDate,
          typeTask: typeTask,
        });
      }
    }

    await this.prisma.task.createMany({ data: taskData });
  }

  async getDissolutionMap(companyId: string): Promise<DissolutionMapDto> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
    });

    if (!company) throw new NotFoundException('Company not found');

    const adminUsers = await this.prisma.staffUser.findMany();
    const dissolutionSteps = await this.prisma.dissolutionFlowStep.findMany({
      orderBy: { stepId: 'asc' },
    });

    const phases = [...new Set(dissolutionSteps.map((step) => step.phase))];
    const mockSteps: DissolutionMapStepDto[] = [];
    let currentStepPos = 1;
    let lastPhaseEndDate = new Date(); // Start from current date

    for (const phase of phases) {
      const phaseSteps = dissolutionSteps.filter(
        (step) => step.phase === phase,
      );
      const numTasks = Math.floor(Math.random() * 7) + 3;

      const mockStep = await this.generateDissolutionMapStep(
        `${phase.toLowerCase().replace(/_/g, ' ')}`,
        adminUsers,
        currentStepPos,
        numTasks,
        lastPhaseEndDate,
      );

      lastPhaseEndDate = new Date(mockStep.endDate);
      // Add buffer between phases (1-3 days)
      lastPhaseEndDate.setDate(
        lastPhaseEndDate.getDate() + Math.floor(Math.random() * 3) + 1,
      );

      mockSteps.push(mockStep);
      currentStepPos++;
    }

    return mockSteps;
  }

  async getDissolutionMapList(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId },
    });

    if (!company) throw new NotFoundException('Company not found');

    const tasks = await this.prisma.task.findMany({
      where: { companyId, category: TaskCategoryEnum.disolution },
      orderBy: [{ stepPosition: 'asc' }, { taskPosition: 'asc' }],
    });

    const groupDta = {};

    for (const elem of tasks) {
      if (!groupDta[elem.stepPosition.toString()]) {
        groupDta[elem.stepPosition.toString()] = {
          stepPosition: elem.stepPosition,
          name: elem.stepName,
          list: [elem],
        };
      } else {
        groupDta[elem.stepPosition.toString()] = {
          ...groupDta[elem.stepPosition.toString()],
          list: [...groupDta[elem.stepPosition.toString()].list, elem],
        };
      }
    }

    const data: DissolutionMapStepDto[] = Object.keys(groupDta).map((step) => {
      let stepProgressTotal = 0;

      const taskList: DissolutionMapTaskDto[] = groupDta[step].list.map(
        (task: Task) => {
          const altDurationInDays = Math.ceil(
            (task.dueDate.getTime() - task.startDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          stepProgressTotal = stepProgressTotal + task.progress;
          const resTask: DissolutionMapTaskDto = {
            id: task.id,
            taskPos: task.taskPosition,
            name: task.description,
            category: task.category,
            typeTask: task.typeTask,
            status: task.status,
            isAssigned: task.isAssigned,
            adminAssigned: task.assignedToAdminId,
            userAssigned: task.assignedToClientId,
            startDate: task.startDate,
            endDate: task.dueDate,
            durationInDays: differenceInDays(task.dueDate, task.startDate),
            progress: task.progress,
          };
          return resTask;
        },
      );

      const startDate = taskList[0].startDate;
      const endDate = taskList[taskList.length - 1].endDate;
      const totalDurationInDays = differenceInDays(endDate, startDate);
      const stepRes: DissolutionMapStepDto = {
        name: groupDta[step].name,
        stepPos: groupDta[step].stepPosition,
        progress: _.floor(stepProgressTotal / taskList.length),
        durationInDays: totalDurationInDays,
        startDate,
        endDate,
        tasks: taskList,
      };

      return stepRes;
    });

    return data;
  }

  async listTasks(pagination: PaginationParams, filters: TasksFilterParamsDto) {
    //validate enums
    if (!Object.values(TaskTypeEnum).includes(filters.typeTask)) {
      throw new BadRequestException('Wrong type task value');
    }

    const queryBuilder = new PrismaQueryBuilder<
      TasksFilterParamsDto,
      Prisma.TaskWhereInput
    >(taskFilterConfig);

    let filterConditions = queryBuilder.buildWhere(filters);

    const skipPages = calcPagination(pagination.page, pagination.limit);

    //complex
    filterConditions = this.additionalFilterTaks(filters, filterConditions);
    const totalItems = await this.prisma.task.count({
      where: filterConditions,
    });

    const tasks = await this.prisma.task.findMany({
      where: filterConditions,
      skip: skipPages,
      take: pagination.limit ? Number(pagination.limit) : undefined,
      include: {
        company: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: this.sortList(
        filters.sortOption,
        filters.sortOrder,
        filters.typeTask,
      ),
    });

    const totalPages = Math.ceil(totalItems / (pagination.limit || totalItems));

    const finalTaks = tasks.map((task) => {
      return {
        ...task,
        key: task.id,
      };
    });

    const paginationRes: PaginationResponse = {
      totalItems,
      totalPages,
      currentPage: pagination.page,
      limit: pagination.limit,
      offset: skipPages,
    };
    return {
      data: finalTaks,
      pagination: paginationRes,
    };
  }

  private additionalFilterTaks(
    filters: TasksFilterParamsDto,
    filterConditions: Prisma.TaskWhereInput,
  ) {
    if (filters.companyName) {
      filterConditions = {
        ...filterConditions,
        company: {
          name: { contains: filters.companyName, mode: 'insensitive' },
        },
      };
    }
    return filterConditions;
  }

  private sortList(
    sortType: TaskSortOptions,
    sortOrder: SortOrderEnum,
    taskType: TaskTypeEnum,
  ) {
    if (sortType === TaskSortOptions.companyName) {
      return { company: { name: sortOrder } };
    }
    if (sortType === TaskSortOptions.assignedToName) {
      if (taskType === TaskTypeEnum.client_task) {
        return { client: { name: sortOrder } };
      }
      if (taskType === TaskTypeEnum.encore_task) {
        return { admin: { name: sortOrder } };
      }
    }

    const order = {};

    order[TaskSortObject[sortType]] = sortOrder;

    return order;
  }

  async assignTasks(payload: AssignTaskDto) {
    payload.ids = [...new Set(payload.ids)];

    const tasks = await this.taskRepo.finsTasksByTaksIds(
      payload.ids,
      payload.taskType,
    );

    if (tasks.length !== payload.ids.length) {
      throw new BadRequestException('Some task couldnt be found');
    }

    if (payload.taskType === TaskTypeEnum.client_task) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) throw new BadRequestException('User not found');

      const validUpdateCheck = async (arr) => {
        for (const task of arr) {
          const userCompnay = await this.prisma.userCompany.findFirst({
            where: {
              companyId: task.company.id,
              userId: payload.userId,
            },
          });
          if (!(await userCompnay)) return false;
        }
        return true;
      };

      const validUpdate = await validUpdateCheck(tasks);

      if (!validUpdate) {
        throw new BadRequestException('The user must be part of the compnay');
      }

      await this.prisma.task.updateMany({
        where: { id: { in: payload.ids } },
        data: {
          assignedToClientId: payload.userId,
          assignedToAdminId: null,
          typeTask: TaskTypeEnum.client_task,
          isAssigned: true,
        },
      });
      return;
    }

    if (payload.taskType === TaskTypeEnum.encore_task) {
      const admin = await this.prisma.staffUser.findUnique({
        where: { id: payload.userId },
      });
      if (!admin) throw new BadRequestException('User not found');

      await this.prisma.task.updateMany({
        where: { id: { in: payload.ids } },
        data: {
          assignedToAdminId: payload.userId,
          typeTask: TaskTypeEnum.encore_task,
          assignedToClientId: null,
          isAssigned: true,
        },
      });
      return;
    }
  }

  async deleteTask(payload: UptadeTaskDto) {
    //unique
    const ids: string[] = [...new Set(payload.ids)];

    try {
      await this.prisma.task.deleteMany({
        where: { id: { in: ids } },
      });
    } catch (error) {
      this.logger.error('error ', error.stack + error);
      throw new BadRequestException(); //?
    }
  }

  async completeTask(payload: UptadeTaskDto) {
    //unique
    const ids: string[] = [...new Set(payload.ids)];

    try {
      await this.prisma.task.updateMany({
        where: {
          id: { in: ids },
          status: { in: [TaskStatusEnum.in_progress, TaskStatusEnum.pending] },
        },
        data: {
          status: TaskStatusEnum.complete,
        },
      });
    } catch (error) {
      this.logger.error('error ', error.stack + error);
      throw new BadRequestException(); //?
    }
  }

  private generateMockTask(
    taskPos: number,
    stepName: string,
    adminUsers: StaffUser[],
    isClientTask: boolean,
    phaseStartDate: Date,
  ): DissolutionMapTaskDto {
    // Random start date between phaseStartDate and 3 days after
    const startDate = new Date(phaseStartDate);
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3));

    const durationInDays = Math.floor(Math.random() * 7) + 3; // 3-10 days duration
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationInDays);

    return {
      id: uuidv4(),
      taskPos,
      name: `${stepName}`,
      category: 'Dissolution',
      typeTask: isClientTask
        ? TaskTypeEnum.client_task
        : TaskTypeEnum.encore_task,
      status: TaskStatusEnum.in_progress,
      isAssigned: false,
      adminAssigned: isClientTask
        ? null
        : adminUsers[Math.floor(Math.random() * adminUsers.length)]?.id || null,
      userAssigned: null,
      startDate,
      endDate,
      durationInDays,
      progress: Math.floor(Math.random() * 100),
    };
  }

  async generateDissolutionMapStep(
    stepName: string,
    adminUsers: StaffUser[],
    stepPos: number,
    numTasks: number,
    phaseStartDate: Date,
  ): Promise<DissolutionMapStepDto> {
    const tasks: DissolutionMapTaskDto[] = [];

    for (let i = 1; i <= numTasks; i++) {
      const isClientTask = i % 2 === 1;
      const task = this.generateMockTask(
        i,
        stepName,
        adminUsers,
        isClientTask,
        phaseStartDate,
      );
      tasks.push(task);
    }

    const startDate = new Date(
      Math.min(...tasks.map((task) => task.startDate.getTime())),
    );
    const endDate = new Date(
      Math.max(...tasks.map((task) => task.endDate.getTime())),
    );

    const durationInDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const avgProgress = Math.floor(
      tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length,
    );

    return {
      name: stepName,
      stepPos,
      startDate,
      endDate,
      durationInDays,
      progress: avgProgress,
      tasks,
    };
  }
}
