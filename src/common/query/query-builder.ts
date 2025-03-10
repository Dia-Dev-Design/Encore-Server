export type FilterOperators = {
  equals?: any;
  contains?: string;
  in?: any[];
  gte?: number | Date;
  lte?: number | Date;
};

export type FilterConfig<T> = {
  [K in keyof T]?: {
    field: string;
    operators: (keyof FilterOperators)[];
  };
};

export class PrismaQueryBuilder<T, WhereType> {
  constructor(private filterConfig: FilterConfig<T>) {}

  buildWhere(filters: Partial<T>): WhereType {
    const where: any = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      const config = this.filterConfig[key as keyof T];
      if (!config) return;

      const { field, operators } = config;

      if (Array.isArray(value) && operators.includes('in')) {
        where[field] = { in: value };
        return;
      }

      if (typeof value === 'string' && operators.includes('contains')) {
        where[field] = { contains: value };
        return;
      }

      if (operators.includes('equals')) {
        where[field] = { equals: value };
        return;
      }
    });

    return where as WhereType;
  }
}
