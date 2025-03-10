import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { Folder } from '@prisma/client';
import { FolderFilterParamsDto } from './dto/folder-filter-param.dto';
import { FileFilterParamsDto } from 'src/files/dto/FileFilterParamsDto';
import { FileRecentResponseDto } from 'src/files/dto/FileRecentResponseDto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { StaffAuth } from 'src/auth/decorators/staff-auth.decorator';

@ApiTags('Folders')
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  async createFolder(
    @Body() createFolderDto: CreateFolderDto,
  ): Promise<Folder> {
    const { name, parentId } = createFolderDto;
    if (!name) {
      throw new HttpException(
        'Folder name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.foldersService.createFolder(name, parentId);
  }

  @Get(':id')
  async getFolder(@Param('id') id: string): Promise<Folder> {
    return this.foldersService.getFolder(id);
  }

  @Patch(':id')
  async updateFolder(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ): Promise<Folder> {
    const { name } = updateFolderDto;
    if (!name) {
      throw new HttpException(
        'Folder name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.foldersService.updateFolder(id, name);
  }

  @Delete(':id')
  async deleteFolder(@Param('id') id: string) {
    return this.foldersService.deleteFolder(id);
  }

  @Patch(':id/move')
  async moveFolder(
    @Param('id') id: string,
    @Body() moveFolderDto: MoveFolderDto,
  ): Promise<Folder> {
    const { newParentId } = moveFolderDto;
    return this.foldersService.moveFolder(id, newParentId);
  }

  @Get(':id/ancestors')
  async getFolderAncestors(@Param('id') id: string): Promise<Folder[]> {
    return this.foldersService.getFolderAncestors(id);
  }

  @Get(':id/folders')
  async getFolders(
    @Param('id') id: string,
    @Query() filterParams: FolderFilterParamsDto,
  ) {
    return this.foldersService.getFolders(id, filterParams);
  }

  @Get(':id/files')
  async getFiles(
    @Param('id') id: string,
    @Query() filterParams: FileFilterParamsDto,
  ) {
    return this.foldersService.getFiles(id, filterParams);
  }

  @Get(':id/files/recent/admin')
  @ApiOperation({
    summary: 'Get recent files from folder and subfolders',
    description:
      'Retrieves a paginated list of files from the specified folder and all its subfolders, ordered by creation date',
  })
  @ApiParam({
    name: 'id',
    description: 'Folder ID',
    example: 'e77f7c4d-6f9e-4c47-8d5d-3c461f9c794a',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (starts from 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved files',
    type: FileRecentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Folder not found',
  })
  @StaffAuth()
  async getRecentFilesAdmin(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<FileRecentResponseDto> {
    return this.foldersService.getRecentFiles(id, page, limit);
  }

  @Get(':id/files/recent')
  @ApiOperation({
    summary: 'Get recent files from folder and subfolders',
    description:
      'Retrieves a paginated list of files from the specified folder and all its subfolders, ordered by creation date',
  })
  @ApiParam({
    name: 'id',
    description: 'Folder ID',
    example: 'e77f7c4d-6f9e-4c47-8d5d-3c461f9c794a',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (starts from 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved files',
    type: FileRecentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Folder not found',
  })
  async getRecentFiles(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<FileRecentResponseDto> {
    return this.foldersService.getRecentFiles(id, page, limit);
  }
}
