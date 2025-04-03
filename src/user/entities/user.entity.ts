import { User } from '@prisma/client';

export class UserEntity implements User {
  id: string;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  lastPasswordChange: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  isAdmin: boolean;
  isActivated: boolean;
  registered: boolean;
  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
