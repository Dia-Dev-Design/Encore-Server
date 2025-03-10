import { PrismaClient } from '@prisma/client';
import { seedIndustries } from './industries.seed';
import seedStaffUsers from './staffUsers.seed';
import seedUsers from './users.seed';
import { seedCompanies } from './companies.seed';
import seedTasks from './tasks.seed';
import { seedCompaniesData } from './companies-data.seed';
import { seedCompaniesAssignedAdminData } from './companies-assigned-admin.seed';
import { seedChatbotBasicData } from './chatbot.seed';
import { seedMeetings } from './meetings.seed';
import { seedDissolutionFlow } from './dissolution.seed';
import { seedFolders } from './folders.seed';
export const seed = async () => {
  const prisma = new PrismaClient();
  try {
    await seedIndustries(prisma);
    await seedStaffUsers(prisma);
    await seedUsers(prisma);
    await seedCompanies(prisma);
    //await seedTasks(prisma);
    await seedCompaniesData(prisma);
    await seedCompaniesAssignedAdminData(prisma);
    await seedChatbotBasicData(prisma);
    // await seedMeetings(prisma);
    await seedDissolutionFlow(prisma);
    await seedFolders(prisma);
  } catch (error) {
    console.error('Error seeding during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seed();
