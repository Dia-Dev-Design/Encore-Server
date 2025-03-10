import {
  PrismaClient,
  Prisma,
  MeetingStatus,
  UserCompanyRole,
} from '@prisma/client';

export const seedMeetings = async (prisma: PrismaClient) => {
  const defaultUser = await prisma.user.findFirst({
    where: {
      email: 'jzuniga+user@shokworks.io',
    },
  });

  const companies = await prisma.company.findMany({
    include: {
      UserCompany: {
        where: { role: UserCompanyRole.OWNER },
        select: { userId: true },
      },
      Meetings: true, // Include meetings to check if any exist
    },
  });

  const meetingTypes = ['First Call', 'Follow Up', 'Check-in', 'Final Review'];

  for (const company of companies) {
    const numberOfMeetings = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < numberOfMeetings; i++) {
      const meetingData: Prisma.MeetingCreateInput = {
        date: new Date(Date.now() + Math.random() * 10000000000), // Random future date
        joinUrl: `https://example.com/meeting/${company.id}/${i}`,
        status: MeetingStatus.PENDING,
        Company: {
          connect: {
            id: company.id,
          },
        },
        User: {
          connect: {
            id:
              company.UserCompany.length > 0
                ? company.UserCompany[0].userId
                : defaultUser?.id,
          },
        },
      };

      await prisma.meeting.create({
        data: meetingData,
      });
    }
  }

  console.log('Meetings seeded successfully');
};
