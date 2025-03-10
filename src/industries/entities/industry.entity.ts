import { Industry } from '@prisma/client';

export class IndustryEntity implements Industry {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<IndustryEntity>) {
    Object.assign(this, partial);
  }
}
