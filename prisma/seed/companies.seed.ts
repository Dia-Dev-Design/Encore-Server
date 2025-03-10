import { Prisma, PrismaClient } from '@prisma/client';

export const seedCompanies = async (prisma: PrismaClient) => {
  const industry = await prisma.industry.findFirst();
  const userErick = await prisma.user.findFirst({
    where: {
      email: 'eumanchuk+user@shokworks.io',
    },
  });
  const userErick2 = await prisma.user.findFirst({
    where: {
      email: 'esubero+user@shokworks.io',
    },
  });

  const companies: Prisma.CompanyCreateInput[] = [
    {
      name: 'Tech Innovators Inc. 2',
      Industry: {
        connect: {
          id: industry?.id,
        },
      },
      structure: 'CORPORATION',
      currentStage: 'DECISIONS_AND_APPROVALS',
      status: 'UNDECIDED',
      hasRaisedCapital: true,
      hasW2Employees: true,
      hasCompletedSetup: true,
      hasBeenEvaluated: true,
      UserCompany: {
        create: {
          User: {
            connect: {
              id: userErick?.id,
            },
          },
          role: 'OWNER',
        },
      },
    },
    {
      name: 'Green Energy LLC 2',
      Industry: {
        connect: {
          id: industry?.id,
        },
      },
      structure: 'LLC',
      status: 'DISTRESSED_SALE',
      currentStage: 'NEW_REGISTERED_CLIENT',
      hasRaisedCapital: false,
      hasW2Employees: false,
      hasCompletedSetup: false,
      hasBeenEvaluated: true,
      UserCompany: {
        create: {
          User: {
            connect: {
              id: userErick2?.id,
            },
          },
          role: 'OWNER',
        },
      },
    },
    {
      name: 'Poorly Managed Company & CO 2',
      Industry: {
        connect: {
          id: industry?.id,
        },
      },
      structure: 'CORPORATION',
      status: 'UNDECIDED',
      currentStage: 'FILING_AND_NOTIFICATIONS',
      hasRaisedCapital: true,
      hasW2Employees: true,
      hasCompletedSetup: true,
      hasBeenEvaluated: true,
      UserCompany: {
        create: {
          User: {
            connect: {
              id: userErick?.id,
            },
          },
          role: 'OWNER',
        },
      },
    },
    {
      name: 'Green Power 2',
      Industry: {
        connect: {
          id: industry?.id,
        },
      },
      structure: 'CORPORATION',
      status: 'UNDECIDED',
      currentStage: 'IP_ASSET_DISPOSITION',
      hasRaisedCapital: true,
      hasW2Employees: true,
      hasCompletedSetup: true,
      hasBeenEvaluated: true,
      UserCompany: {
        create: {
          User: {
            connect: {
              id: userErick?.id,
            },
          },
          role: 'OWNER',
        },
      },
    },
  ];

  for (const company of companies) {
    const existingCompany = await prisma.company.findFirst({
      where: { name: company.name },
    });

    if (!existingCompany) {
      await prisma.company.create({
        data: company,
      });
    }
  }

  console.log('Companies seeded');
};
