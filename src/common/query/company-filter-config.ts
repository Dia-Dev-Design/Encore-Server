import { FilterConfig } from './query-builder';
import { CompanyFilterParamsDto } from 'src/companies/dto/company-filter-params';

export const companyFilterConfig: FilterConfig<CompanyFilterParamsDto> = {
  id: { field: 'id', operators: ['equals'] },
  industryId: { field: 'industryId', operators: ['equals'] },
  name: { field: 'name', operators: ['contains'] },
  parentCompanyId: { field: 'parentCompanyId', operators: ['equals'] },
  hasCompletedSetup: { field: 'hasCompletedSetup', operators: ['equals'] },
  hasBeenEvaluated: { field: 'hasBeenEvaluated', operators: ['equals'] },
  hasRaisedCapital: { field: 'hasRaisedCapital', operators: ['equals'] },
  hasW2Employees: { field: 'hasW2Employees', operators: ['equals'] },
  currentStage: { field: 'currentStage', operators: ['equals'] },
  otherStage: { field: 'otherStage', operators: ['contains'] },
  status: { field: 'status', operators: ['equals'] },
  otherStructure: { field: 'otherStructure', operators: ['contains'] },
  structure: { field: 'structure', operators: ['equals'] },
  createdAt: { field: 'createdAt', operators: ['gte', 'lte'] },
  updatedAt: { field: 'updatedAt', operators: ['gte', 'lte'] },
};
