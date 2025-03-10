import data from './data/industries.json';
import { PrismaClient } from '@prisma/client';

export const seedIndustries = async (prismaClient: PrismaClient) => {
  for (const industry of data) {
    const existingIndustry = await prismaClient.industry.findFirst({
      where: { name: industry },
    });

    if (existingIndustry) continue;

    await prismaClient.industry.create({
      data: {
        name: industry,
      },
    });
  }

  console.log('Industries seeded');
};
