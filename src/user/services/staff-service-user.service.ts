import { Injectable } from '@nestjs/common';
import { StaffUser } from '@prisma/client';
import { StaffUserRepository } from '../repositories/staff-service-user.repository';
import { hash } from 'bcrypt';

@Injectable()
export class StaffUserService {
  constructor(private readonly staffUserRepository: StaffUserRepository) {}

  async findById(id: string): Promise<StaffUser | null> {
    return this.staffUserRepository.findById(id);
  }

  async findByEmail(email: string): Promise<StaffUser | null> {
    return this.staffUserRepository.findByEmail(email);
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<StaffUser> {
    const hashedPassword = await hash(data.password, 10);

    return this.staffUserRepository.create({
      ...data,
      password: hashedPassword,
    });
  }

  async updatePassword(id: string, newPassword: string): Promise<StaffUser> {
    const hashedPassword = await hash(newPassword, 10);

    return this.staffUserRepository.update(id, {
      password: hashedPassword,
      lastPasswordChange: new Date(),
    });
  }

  async setLawyerStatus(id: string, isLawyer: boolean): Promise<StaffUser> {
    return this.staffUserRepository.update(id, { isLawyer });
  }
}
