import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FoldersRepository } from './folders.repository';
import { Folder, Prisma } from '@prisma/client';
import { FolderFilterParamsDto } from './dto/folder-filter-param.dto';
import { FileRepository } from 'src/files/file.repository';
import { FileFilterParamsDto } from 'src/files/dto/FileFilterParamsDto';
import { PrismaQueryBuilder } from 'src/common/query/query-builder';
import { folderFilterConfig } from 'src/common/query/folder-filter-config';
import {
  FileRecentResponseDto,
  FileItemDto,
} from 'src/files/dto/FileRecentResponseDto';
import { S3Service } from 'src/s3/s3.service';

@Injectable()
export class FoldersService {
  constructor(
    private readonly foldersRepository: FoldersRepository,
    private readonly fileRepository: FileRepository,
    private readonly s3Service: S3Service,
  ) {}

  async createFolder(name: string, parentId?: string): Promise<Folder> {
    try {
      if (parentId) {
        const parentFolder =
          await this.foldersRepository.findFolderById(parentId);
        if (!parentFolder) {
          throw new InternalServerErrorException('Parent folder not found');
        }
      }
      return this.foldersRepository.createFolder(name, parentId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error creating folder: ${error.message}`,
      );
    }
  }

  async getFolder(id: string): Promise<Folder> {
    const folder = await this.foldersRepository.findFolderById(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async updateFolder(id: string, name: string): Promise<Folder> {
    try {
      return await this.foldersRepository.renameFolder(id, name);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error updating folder: ${error.message}`,
      );
    }
  }

  async deleteFolder(id: string): Promise<Folder> {
    try {
      return await this.foldersRepository.deleteFolder(id);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error deleting folder: ${error.message}`,
      );
    }
  }

  async moveFolder(id: string, newParentId: string): Promise<Folder> {
    try {
      if (id === newParentId) {
        throw new BadRequestException('Cannot move folder into itself');
      }
      const folder = await this.foldersRepository.findFolderById(id);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
      const newParent =
        await this.foldersRepository.findFolderById(newParentId);
      if (!newParent) {
        throw new NotFoundException('New parent folder not found');
      }
      const ancestors = await this.getFolderAncestors(newParentId);
      if (ancestors.some((ancestor) => ancestor.id === id)) {
        throw new BadRequestException('Cannot move folder into a subfolder');
      }
      return this.foldersRepository.updateFolderParent(id, newParentId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Error moving folder: ${error.message}`,
      );
    }
  }

  async getFolderAncestors(id: string): Promise<Folder[]> {
    const ancestors: Folder[] = [];
    let currentFolder = await this.foldersRepository.findFolderById(id);

    while (currentFolder?.parentId) {
      currentFolder = await this.foldersRepository.findFolderById(
        currentFolder.parentId,
      );
      if (currentFolder) {
        ancestors.unshift(currentFolder);
      }
    }

    return ancestors;
  }

  async getFolders(id: string, filterParams: FolderFilterParamsDto) {
    const { page, limit, ...filters } = filterParams;
    const queryBuilder = new PrismaQueryBuilder<
      FolderFilterParamsDto,
      Prisma.FolderWhereInput
    >(folderFilterConfig);
    const filterConditions = queryBuilder.buildWhere(filters);

    const totalFolders = await this.foldersRepository.countFoldersByParentId(
      id,
      filterConditions,
    );

    const folders = this.foldersRepository.findFoldersByParentId(
      id,
      { page, limit },
      filterConditions,
    );

    return {
      data: folders,
      pagination: {
        totalItems: totalFolders,
      },
    };
  }

  async getFiles(id: string, filterParams: FileFilterParamsDto) {
    const { page, limit } = filterParams;
    const files = await this.fileRepository.findFilesByFolderId(id, {
      page,
      limit,
    });
    const totalFiles = await this.fileRepository.countFilesByFolderId(id);
    return {
      data: files,
      pagination: {
        totalItems: totalFiles,
        totalPages: Math.ceil(totalFiles / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async getRecentFiles(
    id: string,
    page = 1,
    limit = 10,
  ): Promise<FileRecentResponseDto> {
    const files = await this.fileRepository.findFilesInFolderAndSubfolders(id, {
      page,
      limit,
    });
    const totalFiles =
      await this.fileRepository.countFilesInFolderAndSubfolders(id);

    const fileKeys = files.map((fileReference) => fileReference.File.key);
    const downloadUrls = await this.s3Service.getSignedUrls(fileKeys);

    const fileItems: FileItemDto[] = await Promise.all(
      files.map(async (fileReference, index) => {
        // Determine owner from relationships
        let owner = 'Unknown';

        if (fileReference.User?.name) {
          owner = fileReference.User.name;
        } else if (fileReference.StaffUser?.name) {
          owner = fileReference.StaffUser.name;
        } else if (fileReference.File.ChatThread?.[0]?.User?.name) {
          owner = fileReference.File.ChatThread[0].User.name;
        }

        return {
          id: fileReference.fileId,
          key: fileReference.fileId,
          name: fileReference.File.originalName || fileReference.File.key,
          product: fileReference.product,
          taskOrChat: fileReference.File.ChatThread?.[0]?.title || '-',
          owner,
          uploadDate: fileReference.createdAt,
          location:
            fileReference.Folder.name === fileReference.folderId
              ? '-'
              : fileReference.Folder.name,
          downloadUrl: downloadUrls[index],
        };
      }),
    );

    return {
      data: fileItems,
      pagination: {
        totalItems: totalFiles,
        totalPages: Math.ceil(totalFiles / limit),
        currentPage: page,
        limit,
      },
    };
  }
}
