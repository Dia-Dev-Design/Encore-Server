import {
  Body,
  Controller,
  Param,
  Post,
  Query,
  // Request,
  Sse,
  Req
} from '@nestjs/common';

import { Observable } from 'rxjs';

import { ChatLawyerService } from '../services/chat-lawyer.service';
import { CreateMessageForChatLawyerDto } from '../dto/message-lawyer.dto';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { StaffAuth } from '../../auth/decorators/staff-auth.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Request } from 'express';

import { GetUserId } from '../dto/message-lawyer.dto';




@Controller('chatbot/lawyer-chat')
export class ChatbotLawyerController {
  constructor(private readonly chatLawyerService: ChatLawyerService) {}

  @Sse('joinChat')
  //@ApiBearerAuth()
  @Public()
  async joinChat(
    @Query('userId') userId: string,
    @Query('chatThreadId') chatId: string,
  ): Promise<Observable<any>> {
    return await this.chatLawyerService.getSSEMessages(
      chatId,
      userId,
      UserTypeEnum.USER_COMPANY,
    );
  }

  @Sse('joinChat/lawyer')
  //@ApiBearerAuth()
  //@StaffAuth()
  @Public()
  async joinChatLawyer(
    @Query('userId') userId: string,
    @Query('chatId') chatId: string,
  ): Promise<Observable<any>> {
    return await this.chatLawyerService.getSSEMessages(
      chatId,
      userId,
      UserTypeEnum.USER_STAFF,
    );
  }

  //escribir msj
  //TODO delete
  @Post('send-message/:chatThreadId')
  @ApiBearerAuth()
  //@Public()
  @ApiBody({ type: CreateMessageForChatLawyerDto })
  async sendMessage(
    @Body() payload: CreateMessageForChatLawyerDto,
    @Param('chatThreadId') chatThreadId: string,
    @Req() req,
  ) {
    return await this.chatLawyerService.sendMessage(
      chatThreadId,
      payload,
      req?.user?.id,
      UserTypeEnum.USER_COMPANY,
    );
  }

  @Post('send-message/lawyer/:chatThreadId')
  @ApiBearerAuth()
  //@StaffAuth()
  @Public()
  @ApiBody({ type: CreateMessageForChatLawyerDto })
  async sendMessageLawyer(
    @Body() payload: CreateMessageForChatLawyerDto,
    @Param('chatThreadId') chatThreadId: string,
    @Req() req,
  ) {
    return await this.chatLawyerService.sendMessage(
      chatThreadId,
      payload,
      req?.user?.id,
      UserTypeEnum.USER_STAFF,
    );
  }

  @Post('request/:chatThreadId')
  @ApiBearerAuth()
  async requestLawyer(
    @Req() req,
    @Param('chatThreadId') chatThreadId: string,
  ) {
    return await this.chatLawyerService.requestLawyer(
      req?.user?.id,
      chatThreadId,
    );
  }

  // Special admin endpoint with no authentication checks
  @Post('admin-message/:chatThreadId')
  @StaffAuth()
  @ApiBearerAuth()
  @ApiBody({ type: CreateMessageForChatLawyerDto })
  async sendAdminMessage(
    @Body() payload: CreateMessageForChatLawyerDto,
    @GetUserId() userId: string,
    @Param('chatThreadId') chatThreadId: string,
    @Req() req: Request, // Add this to access the authenticated user
  ) {
    console.log(
      `Admin message endpoint called for thread ${chatThreadId}, userId: ${userId}`,
    );
    
    // Call a special method that skips permission checks
    return await this.chatLawyerService.sendAdminMessage(
      chatThreadId,
      payload,
      userId
    );
  }

  //admin
}
