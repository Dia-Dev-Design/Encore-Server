import { Prisma, PrismaClient } from '@prisma/client';

export const seedCompaniesAssignedAdminData = async (prisma: PrismaClient) => {
  const companies = await prisma.company.findMany({
    include: { AssignedAdmin: true },
    where: {
      AssignedAdmin: { is: null },
    },
  });
  //console.log({ test: companies[0] });

  //console.log({ len: companies.length });
  if (companies.length > 0) {
    const admins = await prisma.staffUser.findMany();
    for (const company of companies) {
      const pos = Math.floor(Math.random() * admins.length);

      await prisma.company.update({
        where: { id: company.id },
        data: { assignedAdminId: admins[pos].id },
      });
    }
  }

  console.log('Companies assigned admin data seeded');
};
