import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileReference, Prisma } from '@prisma/client';
import { PaginationParams } from 'src/types/pagination';
import { FileFilterParamsDto } from './dto/FileFilterParamsDto';

@Injectable()
export class FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findFilesByFolderId(
    folderId: string,
    pagination: PaginationParams,
  ): Promise<FileReference[]> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const fileReferences = await this.prisma.folderFileReference.findMany({
      where: { folderId },
      skip,
      take: limit,
      include: {
        File: true,
      },
    });

    return fileReferences.map((fileReference) => fileReference.File);
  }

  async countFilesByFolderId(folderId: string): Promise<number> {
    return this.prisma.folderFileReference.count({ where: { folderId } });
  }

  async findFilesInFolderAndSubfolders(
    folderId: string,
    pagination: PaginationParams,
  ) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const folderIds = await this.getAllSubfolderIds(folderId);

    const fileReferences = await this.prisma.folderFileReference.findMany({
      where: {
        folderId: { in: folderIds },
      },
      skip,
      take: limit,
      include: {
        File: {
          include: {
            ChatThread: {
              select: {
                title: true,
                User: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        Folder: {
          select: {
            name: true,
          },
        },
        User: {
          select: {
            name: true,
          },
        },
        StaffUser: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return fileReferences;
  }

  async countFilesInFolderAndSubfolders(folderId: string): Promise<number> {
    const folderIds = await this.getAllSubfolderIds(folderId);

    return this.prisma.folderFileReference.count({
      where: {
        folderId: { in: folderIds },
      },
    });
  }

  private async getAllSubfolderIds(folderId: string): Promise<string[]> {
    const result = new Set<string>([folderId]);

    const getChildFolders = async (parentId: string) => {
      const children = await this.prisma.folder.findMany({
        where: { parentId },
        select: { id: true },
      });

      for (const child of children) {
        result.add(child.id);
        await getChildFolders(child.id);
      }
    };

    await getChildFolders(folderId);
    return Array.from(result);
  }
}
