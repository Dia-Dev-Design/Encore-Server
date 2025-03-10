import { PrismaClient, Prisma } from '@prisma/client';

const seedTasks = async (prisma: PrismaClient) => {
  const existingTaks = await prisma.task.findFirst();

  if (!existingTaks) {
    const companies = await prisma.company.findMany({
      take: 3,
    });

    const staffs = await prisma.staffUser.findMany({ take: 1 });
    const users = await prisma.user.findMany({ take: 1 });

    const date = new Date();
    for (const company of companies) {
      const daysToDue = Math.floor(Math.random() * (100 - 5) + 5);

      const taskData: Prisma.TaskCreateManyInput[] = [
        {
          category: 'Disolution',
          status: 'in_progress',
          progress: 75,
          typeTask: 'encore_task',
          assignedToAdminId: null,
          assignedToClientId: null,
          isAssigned: false,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue)),
          companyId: company.id,
          description: 'Cras in sem non ipsum luctus euismod',
        },
        {
          category: 'Disolution',
          status: 'pending',
          progress: 0,
          typeTask: 'encore_task',
          assignedToAdminId: null,
          assignedToClientId: null,
          isAssigned: false,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue)),
          companyId: company.id,
          description: 'Cras in sem non ipsum luctus euismod',
        },
        {
          category: 'Disolution',
          status: 'complete',
          progress: 100,
          typeTask: 'encore_task',
          assignedToAdminId: staffs[0].id,
          assignedToClientId: null,
          isAssigned: true,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue)),
          companyId: company.id,
          description:
            'Nam pellentesque massa ut metus imperdiet, quis varius justo dictum',
        },
        {
          category: 'Chatbot',
          status: 'in_progress',
          progress: 25,
          typeTask: 'client_task',
          assignedToAdminId: null,
          assignedToClientId: users[0].id,
          isAssigned: true,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue) + 15),
          companyId: company.id,
          description:
            'Aenean porta elementum ante, quis convallis dolor mattis et. Maecenas quis leo ullamcorper purus laoreet blandit. Nullam tempus rhoncus nis',
        },
        {
          category: 'Chatbot',
          status: 'pending',
          progress: 0,
          typeTask: 'client_task',
          assignedToAdminId: null,
          assignedToClientId: users[0].id,
          isAssigned: true,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue) + 15),
          companyId: company.id,
          description:
            'Aenean porta elementum ante, quis convallis dolor mattis et. Maecenas quis leo ullamcorper purus laoreet blandit. Nullam tempus rhoncus nis',
        },
        {
          category: 'Disolution & Chatbot',
          status: 'complete',
          progress: 100,
          typeTask: 'client_task',
          assignedToAdminId: null,
          assignedToClientId: null,
          isAssigned: false,
          dueDate: new Date(date.setDate(date.getDate() + daysToDue + 10)),
          companyId: company.id,
          description:
            'ras placerat lorem at magna ultricies semper. Fusce quis sem dapibus',
        },
      ];

      await prisma.task.createMany({
        data: taskData,
      });
    }
  }

  console.log('Tasks seeded successfully');
};

export default seedTasks;
