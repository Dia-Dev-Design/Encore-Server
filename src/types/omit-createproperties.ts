export type OmitCreateProperties<
  T extends { id: string; createdAt: Date; updatedAt: Date },
> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
