import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Folder, Prisma } from '@prisma/client';
import { PaginationParams } from 'src/types/pagination';
import { FolderFilterParamsDto } from './dto/folder-filter-param.dto';

@Injectable()
export class FoldersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    return this.prisma.folder.create({
      data: {
        name,
        parentId,
      },
    });
  }

  async findFolderById(id: string): Promise<Folder | null> {
    return this.prisma.folder.findUnique({ where: { id } });
  }

  async renameFolder(id: string, name: string): Promise<Folder> {
    return this.prisma.folder.update({
      where: { id },
      data: { name },
    });
  }

  async deleteFolder(id: string): Promise<Folder> {
    return this.prisma.folder.delete({ where: { id } });
  }

  async updateFolderParent(id: string, newParentId: string): Promise<Folder> {
    return this.prisma.folder.update({
      where: { id },
      data: { parentId: newParentId },
    });
  }

  async countFoldersByParentId(
    parentId: string,
    where?: Prisma.FolderWhereInput,
  ): Promise<number> {
    return this.prisma.folder.count({ where: { parentId, ...where } });
  }

  async findFoldersByParentId(
    parentId: string,
    pagination: PaginationParams,
    filters: Prisma.FolderWhereInput,
  ): Promise<Folder[]> {
    const { page, limit } = pagination;

    const skip = (page - 1) * limit;

    return this.prisma.folder.findMany({
      where: { parentId, ...filters },
      skip,
      take: limit,
    });
  }
}
