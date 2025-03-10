import { FilterConfig } from './query-builder';
import { FolderFilterParamsDto } from 'src/folders/dto/folder-filter-param.dto';

export const folderFilterConfig: FilterConfig<FolderFilterParamsDto> = {
  name: { field: 'name', operators: ['equals'] },
  createdAt: { field: 'createdAt', operators: ['gte', 'lte'] },
};
