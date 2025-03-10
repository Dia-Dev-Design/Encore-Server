// for each company create a root folder, if not already has one and has completed setup

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export const seedFolders = async (prisma: PrismaClient) => {
  const companies = await prisma.company.findMany({
    where: {
      rootFolderId: null,
    },
  });

  for (const company of companies) {
    const rootFolderId = uuidv4();
    const rootFolder = await prisma.folder.create({
      data: {
        id: rootFolderId,
        name: rootFolderId,
        companyId: company.id,
      },
    });

    await prisma.company.update({
      where: { id: company.id },
      data: { rootFolderId: rootFolder.id },
    });
  }

  console.log('Folders seeded');
};
