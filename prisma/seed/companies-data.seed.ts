import { Prisma, PrismaClient } from '@prisma/client';

export const seedCompaniesData = async (prisma: PrismaClient) => {
  const companies = await prisma.company.findMany({
    include: { CompanyStateLocation: true },
    where: {
      CompanyStateLocation: { none: {} },
    },
  });
  //console.log({ test: companies[0] });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function randomElements(array, quantity) {
    return shuffleArray([...array]).slice(0, quantity);
  }
  const dataStates = ['AK', 'AZ', 'CA', 'FL', 'IL', 'MS', 'NE', 'NY', 'VA'];

  //console.log({ len: companies.length });
  if (companies.length > 0) {
    for (const company of companies) {
      const totalStates = Math.floor(Math.random() * (3 - 1) + 1);
      //console.log({ totalStates });
      const selectStates = randomElements(dataStates, totalStates);

      for (const state of selectStates) {
        await prisma.companyStateLocation.create({
          data: {
            state,
            companyId: company.id,
          },
        });
      }
    }
  }

  console.log('Companies data seeded');
};
