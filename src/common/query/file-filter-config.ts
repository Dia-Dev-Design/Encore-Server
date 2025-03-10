import { FileFilterParamsDto } from 'src/files/dto/FileFilterParamsDto';
import { FilterConfig } from './query-builder';

export const fileFilterConfig: FilterConfig<FileFilterParamsDto> = {
  name: { field: 'name', operators: ['equals'] },
  createdAt: { field: 'createdAt', operators: ['gte', 'lte'] },
};
