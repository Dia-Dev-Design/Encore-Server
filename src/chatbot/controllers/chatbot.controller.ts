import {
  Body,
  Controller,
  Post,
  Get,
  Request,
  HttpException,
  HttpStatus,
  Param,
  UploadedFile,
  Query,
  UseInterceptors,
  Patch,
  NotFoundException,
  ForbiddenException,
  Res,
  Req,
} from '@nestjs/common';
import { ChatbotService } from '../services/chatbot.service';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FileReference } from '@prisma/client';
import { S3Service } from 'src/s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffAuth } from '../../auth/decorators/staff-auth.decorator';
import { Public } from '@prisma/client/runtime/library';
import { User } from 'src/auth/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
import { CompaniesService } from 'src/companies/companies.service';
import { DocHubService } from 'src/dochub/services/dochub.service';
import { Response } from 'express';

enum Sentiment {
  GOOD = 'GOOD',
  BAD = 'BAD',
  NEUTRAL = 'NEUTRAL',
}

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly s3Service: S3Service,
    private readonly companyService: CompaniesService,
    private readonly docHubService: DocHubService,
  ) {}

  @Post('threads')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Chat successfully created',
  })
  async createThread(@Request() req) {
    return this.chatbotService.createThread(req?.user?.id);
  }

  @Get('threads')
  @ApiResponse({
    status: 200,
    description: 'Chat successfully created',
  })
  async getThreads(@Request() req) {
    return this.chatbotService.getThreads(req?.user?.id);
  }

  @Get('threads/all')
  @ApiResponse({
    status: 200,
    description:
      'Threads and their relationship with categories successfully retrieved',
  })
  async getThreadsWithCategories(@Request() req) {
    return this.chatbotService.getAllThreadsAndCategories(req?.user?.id);
  }

  @Get('threads/files/:thread_id')
  @ApiResponse({
    status: 200,
    description: 'Chat successfully created',
  })
  async getThreadFiles(@Param('thread_id') thread_id: string, @Request() req) {
    return this.chatbotService.getFilesByThread(thread_id, req?.user?.id);
  }

  @Get('threads/:thread_id')
  @ApiResponse({
    status: 200,
    description: 'Chat successfully created',
  })
  async getThread(@Param('thread_id') thread_id: string, @Request() req) {
    return this.chatbotService.getThread(thread_id, req?.user?.id);
  }

  @Patch('threads/:thread_id')
  @ApiResponse({
    status: 200,
    description: 'Thread successfully updated',
  })
  async updateThread(
    @Param('thread_id') thread_id: string,
    @Body() body,
    @Request() req,
  ) {
    const { title } = body;
    if (!title) {
      new HttpException(`Thread title is required`, HttpStatus.BAD_REQUEST);
    }
    return this.chatbotService.updateThread(req?.user?.id, thread_id, title);
  }

  @Post('threads/:thread_id/categories')
  @ApiResponse({
    status: 200,
    description: 'Thread successfully associated with category',
  })
  async associateThreadWithCategory(
    @Param('thread_id') thread_id: string,
    @Body() body: { category_id: string },
    @Request() req,
  ) {
    const { category_id } = body;
    if (!category_id) {
      throw new HttpException(
        `Category ID is required`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.chatbotService.associateThreadWithCategory(
      req?.user?.id,
      thread_id,
      category_id,
    );
  }

  @Get('threads/uncategorized')
  @ApiResponse({
    status: 200,
    description: 'Threads successfully retrieved without category',
  })
  async getUncategorizedThreads(@Request() req) {
    return this.chatbotService.getUncategorizedThreads(req?.user?.id);
  }

  @Post('categories')
  @ApiResponse({
    status: 200,
    description: 'Category successfully created',
  })
  async createCategory(@Request() req, @Body() body) {
    const { name } = body;
    if (!name) {
      new HttpException(`Category name is required`, HttpStatus.BAD_REQUEST);
    }
    return this.chatbotService.createCategory(req?.user?.id, name);
  }

  @Patch('categories/:categoryId')
  @ApiResponse({
    status: 200,
    description: 'Category successfully updated',
  })
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body,
    @Request() req,
  ) {
    const { name } = body;
    if (!name) {
      new HttpException(`Category name is required`, HttpStatus.BAD_REQUEST);
    }
    return this.chatbotService.updateCategory(req?.user?.id, categoryId, name);
  }

  @Get('categories')
  @ApiResponse({
    status: 200,
    description: 'Category successfully created',
  })
  async getCategories(@Request() req) {
    return this.chatbotService.getCategories(req?.user?.id);
  }

  @Get('categories/:categoryId/threads')
  @ApiResponse({
    status: 200,
    description: 'Threads successfully retrieved for the category',
  })
  async getThreadsByCategory(
    @Param('categoryId') categoryId: string,
    @Request() req,
  ) {
    return this.chatbotService.getThreadsByCategory(req?.user?.id, categoryId);
  }

  @Post('ask')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Answer successfully generated',
  })
  async handlePrompt(@Request() req, @Body() body) {
    const { thread_id, prompt, fileId } = body;

    if (!thread_id) {
      throw new HttpException('Thread ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!prompt) {
      throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Verify user is authorized to access this thread
      const thread = await this.chatbotService.getThread(
        thread_id,
        req?.user?.id,
      );
      if (!thread) {
        throw new HttpException(
          'Thread not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }

      const response = await this.chatbotService.processPrompt(
        req?.user?.id,
        thread_id,
        prompt,
        fileId || null,
      );

      return { response };
    } catch (error) {
      console.error('Error processing prompt:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error processing prompt: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ask/stream')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Streamed answer generation' })
  async streamPrompt(@Req() req, @Body() body, @Res() response: Response) {
    const { thread_id, prompt, fileId } = body;

    // Validate inputs
    if (!thread_id || !prompt) {
      response.write(
        `data: ${JSON.stringify({ error: 'Thread ID and prompt are required' })}\n\n`,
      );
      // Use type assertion to avoid TypeScript error with flush
      if (
        'flush' in response &&
        typeof (response as any).flush === 'function'
      ) {
        (response as any).flush();
      }
      response.end();
      return;
    }

    // Set headers for streaming and CORS
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if using nginx

    try {
      // Verify thread access before starting stream
      const thread = await this.chatbotService.getThread(
        thread_id,
        req?.user?.id,
      );
      if (!thread) {
        response.write(
          `data: ${JSON.stringify({ error: 'Thread not found or access denied' })}\n\n`,
        );
        // Use type assertion to avoid TypeScript error with flush
        if (
          'flush' in response &&
          typeof (response as any).flush === 'function'
        ) {
          (response as any).flush();
        }
        response.end();
        return;
      }

      // Write initial confirmation that stream is starting
      response.write(`data: ${JSON.stringify({ content: '' })}\n\n`);

      // Stream response to client
      await this.chatbotService.streamPrompt(
        req?.user?.id,
        thread_id,
        prompt,
        fileId || null,
        // Pass a callback to handle each chunk
        (chunk) => {
          response.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          // Use type assertion to avoid TypeScript error with flush
          if (
            'flush' in response &&
            typeof (response as any).flush === 'function'
          ) {
            (response as any).flush();
          }
        },
      );

      response.end();
    } catch (error) {
      console.error('Error streaming prompt:', error);

      // Extract a meaningful error message
      let errorMessage = 'An error occurred while generating a response';
      if (error instanceof HttpException) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Send the error to the client
      response.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      // Use type assertion to avoid TypeScript error with flush
      if (
        'flush' in response &&
        typeof (response as any).flush === 'function'
      ) {
        (response as any).flush();
      }
      response.end();
    }
  }

  @Get('history/:thread_id')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Chat history successfully retrieved',
  })
  async getHistory(@Request() req, @Param('thread_id') thread_id: string) {
    if (!thread_id) {
      throw new HttpException(`Thread ID is required`, HttpStatus.BAD_REQUEST);
    }
    try {
      const response = await this.chatbotService.getHistory(
        req?.user?.id,
        thread_id,
      );
      return { response };
    } catch (error) {
      throw new HttpException(
        `Error retrieving history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserEntity,
    @Query('threadId') threadId: string,
  ): Promise<FileReference> {
    try {
      const thread = await this.chatbotService.getThreadById(threadId);
      if (!thread) {
        throw new NotFoundException(`Thread not found`);
      }

      if (thread.userId !== user.id) {
        throw new ForbiddenException(
          `You are not allowed to upload files to this thread`,
        );
      }

      const company = await this.companyService.getCompanyById(
        thread.ChatCompany.companyId,
      );

      const fileReference = await this.s3Service.uploadFile(file, 'AI', {
        userId: user.id,
        threadId,
        rootFolderId: company.rootFolderId,
      });
      await this.chatbotService.loadAndProcessDocuments(
        file.buffer,
        fileReference.id,
        threadId,
      );
      return fileReference;
    } catch (error) {
      throw new HttpException(
        `Error uploading file: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('messages/:threadId')
  @ApiResponse({
    status: 200,
    description: 'Messages successfully retrieved',
  })
  async getMessages(
    @Request() req,
    @Param('threadId') threadId: string,
    @Query('is_favorite') isFavorite?: boolean,
    @Query('sentiment') sentiment?: Sentiment,
  ) {
    const userId = req.user.id;
    const messages = await this.chatbotService.getMessages(
      userId,
      threadId,
      isFavorite,
      sentiment,
    );
    return messages;
  }

  @Patch('messages')
  @ApiResponse({
    status: 200,
    description: 'Checkpoint successfully updated',
  })
  async updateCheckpoint(
    @Param('checkpointId') checkpointId: string,
    @Body() body,
    @Request() req,
  ) {
    const { threadId, isFavorite, sentiment } = body;
    if (!checkpointId) {
      throw new HttpException(
        `Checkpoint ID is required`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!threadId) {
      throw new HttpException(`Thread ID is required`, HttpStatus.BAD_REQUEST);
    }
    if (isFavorite === undefined && sentiment === undefined) {
      throw new HttpException(
        `At least one of 'isFavorite' or 'sentiment' is required`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.chatbotService.updateCheckpoint(
      req?.user?.id,
      threadId,
      checkpointId,
      isFavorite,
      sentiment,
    );
  }
  //admin
  @Get('admin/threads/all/:companyId')
  @ApiBearerAuth()
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description:
      'Threads and their relationship with categories successfully retrieved',
  })
  async getThreadsForAdmin(
    @Request() req,
    @Param('companyId') companyId: string,
  ) {
    return this.chatbotService.getAllThreadsForAdmin(companyId, req?.user?.id);
  }

  //e18b7cf1-de30-4426-a6d3-278a36014350
  @Get('admin/history/:threadId')
  @ApiBearerAuth()
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description: 'Chat history successfully retrieved',
  })
  async getHistoryForAdmin(@Param('threadId') threadId: string) {
    if (!threadId) {
      throw new HttpException(`Thread ID is required`, HttpStatus.BAD_REQUEST);
    }
    try {
      const response = await this.chatbotService.getHistory(null, threadId);
      return { response };
    } catch (error) {
      throw new HttpException(
        `Error retrieving history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
