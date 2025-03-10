import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const seedUsers = async (prisma: PrismaClient) => {
  const usersData: Prisma.UserCreateInput[] = [
    {
      name: 'José Zuniga',
      email: 'jzuniga+user@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
    {
      name: 'Erick Subero',
      email: 'esubero+user@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
    {
      name: 'Karen Carreño',
      email: 'kcarreno+user@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
    {
      name: 'Erick Umanchuk',
      email: 'eumanchuk+user@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
    {
      name: 'Juliana Ramirez',
      email: 'jramirez+user@shokworks.io',
      password: bcrypt.hashSync('3W9E~&f(33)w', 10),
    },
  ];

  for (const userData of usersData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData,
      });
    }
  }

  console.log('Users seeded successfully');
};

export default seedUsers;
