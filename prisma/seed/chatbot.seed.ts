import { Prisma, PrismaClient } from '@prisma/client';

export const seedChatbotBasicData = async (prisma: PrismaClient) => {
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

  //const existChatbot = await prisma.chatCompany.findMany();

  const companies = await prisma.company.findMany({
    include: { ChatCompany: true, services: true },
    where: {
      ChatCompany: { is: null },
      services: { some: { service: 'AI_CHATBOT' } },
    },
    take: 5,
  });

  //console.log({ companies });

  const dataStatus = ['none', 'requested', 'in_process', 'done'];

  for (const company of companies) {
    const selectSatus = randomElements(dataStatus, 1);
    // console.log({ company: company.id });
    await prisma.chatCompany.create({
      data: {
        companyId: company.id,
        lawyerReqStatus: selectSatus[0],
      },
    });
  }

  console.log('Companies chatbots data seeded');
};
