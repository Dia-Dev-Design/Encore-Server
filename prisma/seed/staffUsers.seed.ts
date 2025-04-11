import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const seedStaffUsers = async (prisma: PrismaClient) => {
  const staffUsersData: Prisma.StaffUserCreateInput[] = [

    {
      name: 'Erick Subero',
      email: 'esubero+admin@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
    {
      name: 'Admin',
      email: 'admin@startupencore.ai',
      password: bcrypt.hashSync('iN3026,7_', 10),
    },
    {
      name: 'Karina',
      email: 'karina@startupencore.ai',
      password: bcrypt.hashSync('nyzNvxgdOL123', 10),
    },
    {
      name: 'Hiram',
      email: 'hiram@startupencore.ai',
      password: bcrypt.hashSync('nyzNvxgdOL123', 10),
    },
    {
      name: 'Ben',
      email: 'ben@caldera.law',
      password: bcrypt.hashSync('nyzNvxgdOL123', 10),
    },
  ];

  for (const userData of staffUsersData) {
    const existingUser = await prisma.staffUser.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      await prisma.staffUser.create({
        data: userData,
      });
    }
  }

  // Update passwords for specific users
  await prisma.staffUser.update({
    where: { email: 'karina@startupencore.ai' },
    data: { password: bcrypt.hashSync('nyzNvxgdOL123', 10), isLawyer: true },
  });

  await prisma.staffUser.update({
    where: { email: 'hiram@startupencore.ai' },
    data: { password: bcrypt.hashSync('nyzNvxgdOL123', 10), isLawyer: true },
  });

  await prisma.staffUser.update({
    where: { email: 'ben@caldera.law' },
    data: { password: bcrypt.hashSync('nyzNvxgdOL123', 10), isLawyer: true },
  });

  console.log('Staff users seeded successfully');
};

export default seedStaffUsers;
