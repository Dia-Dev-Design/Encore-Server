import { TasksFilterParamsDto } from '../../tasks/dto/task-cms-filter.dto';
import { FilterConfig } from './query-builder';

export const taskFilterConfig: FilterConfig<TasksFilterParamsDto> = {
  typeTask: { field: 'typeTask', operators: ['equals'] },
  status: { field: 'status', operators: ['equals'] },
  category: { field: 'category', operators: ['equals'] },
  companyId: { field: 'companyId', operators: ['equals'] },
  // id: { field: 'id', operators: ['equals'] },
  // industryId: { field: 'industryId', operators: ['equals'] },
  // name: { field: 'name', operators: ['contains'] },
  // parentCompanyId: { field: 'parentCompanyId', operators: ['equals'] },
  // hasCompletedSetup: { field: 'hasCompletedSetup', operators: ['equals'] },
  // hasRaisedCapital: { field: 'hasRaisedCapital', operators: ['equals'] },
  // hasW2Employees: { field: 'hasW2Employees', operators: ['equals'] },
  // currentStage: { field: 'currentStage', operators: ['equals'] },
  // otherStage: { field: 'otherStage', operators: ['contains'] },
  // otherStructure: { field: 'otherStructure', operators: ['contains'] },
  // structure: { field: 'structure', operators: ['equals'] },
  //createdAt: { field: 'createdAt', operators: ['gte', 'lte'] },
  //updatedAt: { field: 'updatedAt', operators: ['gte', 'lte'] },
};
