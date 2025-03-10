import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, map, Observable } from 'rxjs';

import {
  CreateMessageForChatLawyerDto,
  MessageForChatLawyerDto,
} from '../dto/message-lawyer.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserTypeEnum } from '../../user/enums/user-type.enum';
import { Prisma } from '@prisma/client';
import {
  ChatbotLawyerReqStatusEnum,
  ChatLawyerStatus,
  ChatTypeEnum,
} from '../enums/chatbot.enum';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  notificationCategoryEnum,
  notificationTypeEnum,
} from '../../notifications/enum/notifications.enum';
import {
  TaskCategoryEnum,
  TaskStatusEnum,
  TaskTypeEnum,
} from '../../tasks/enums/task.enum';
import { add } from 'date-fns';

@Injectable()
export class ChatLawyerService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationsService,
  ) {}

  async getSSEMessages(
    chatThreadId: string,
    userId: string,
    userType: UserTypeEnum,
  ): Promise<Observable<any>> {
    //console.log({ chatThreadId });
    const chat = await this.prisma.chatThread.findFirst({
      where: { id: chatThreadId },
    });
    if (!chat) throw new NotFoundException('chat not found');

    //console.log({ chat });

    //Find user
    let userCompany = null;
    let userStaff = null;
    let isInChat = false;
    if (userType === UserTypeEnum.USER_COMPANY) {
      userCompany = await this.prisma.user.findFirst({ where: { id: userId } });
      console.log({ userCompany });
      if (!userCompany) throw new NotFoundException('user not found');

      //console.log({ userId });
      isInChat = chat.userId === userId;
    }
    if (userType === UserTypeEnum.USER_STAFF) {
      userStaff = await this.prisma.staffUser.findFirst({
        where: { id: userId },
      });
      if (!userStaff) throw new NotFoundException('user not found');

      isInChat = true;
    }

    //console.log({ isInChat });

    if (!isInChat) throw new BadRequestException('you cant join this chat');

    //retornar la conexion
    return this.getSSE(chatThreadId);
  }

  async sendMessage(
    chatThreadId: string,
    payload: CreateMessageForChatLawyerDto,
    userId: string,
    userType: UserTypeEnum,
  ) {
    const chat = await this.prisma.chatThread.findFirst({
      where: { id: chatThreadId },
    });
    if (!chat) throw new NotFoundException('chat not found');

    //Find user
    let userCompany = null;
    let userStaff = null;
    let isInChat = false;
    let userResponseId = null;
    let userResponseName = null;

    if (userType === UserTypeEnum.USER_COMPANY) {
      userCompany = await this.prisma.user.findFirst({ where: { id: userId } });
      if (!userCompany) throw new NotFoundException('user not found');

      //console.log({ userId });
      isInChat = chat.userId === userId;

      userResponseId = userCompany.id;
      userResponseName = userCompany.name;
    }
    if (userType === UserTypeEnum.USER_STAFF) {
      userStaff = await this.prisma.staffUser.findFirst({
        where: { id: userId },
      });
      if (!userStaff) throw new NotFoundException('user not found');

      const chatLawyer = await this.prisma.chatLawyer.findFirst({
        where: {
          ChatThreadId: chatThreadId,
          lawyerId: userStaff.id,
          status: ChatLawyerStatus.ACTIVE,
        },
      });
      if (chatLawyer) isInChat = true;

      userResponseId = userStaff.id;
      userResponseName = userStaff.name;
    }

    //console.log({ isInChat });

    if (!isInChat)
      throw new BadRequestException('you cant send a message in this chat');

    //-----

    const newMessageData: Prisma.ChatLawyerMessageCreateArgs = {
      data: {
        content: payload.message,
        userMessageType: userType,
        ChatThreadId: chatThreadId,
        lawyerId: userStaff?.id,
        userId: userCompany?.id,
        fileId: payload.fileId,
      },
    };

    const newMessage =
      await this.prisma.chatLawyerMessage.create(newMessageData);

    const message: MessageForChatLawyerDto = {
      type: ChatTypeEnum.CHAT_LAWYER,
      message: {
        content: payload.message,
        id: newMessage.id,
        fileId: payload.fileId,
        createdAt: newMessage.createdAt,
        updatedAt: newMessage.updatedAt,
        user: {
          id: userResponseId,
          typeUser: userType,
          name: userResponseName,
        },
      },
    };

    this.sendSSE(message, chatThreadId);
  }

  async requestLawyer(userId: string, chatThreadId: string) {
    const chat = await this.prisma.chatThread.findFirst({
      where: { id: chatThreadId },
    });
    if (!chat) throw new NotFoundException('chat not found');

    const userCompany = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    if (!userCompany) throw new NotFoundException('user not found');

    //console.log({ userId });
    const isInChat = chat.userId === userId;
    if (!isInChat)
      throw new BadRequestException('you cant request a lawyer in this chat');

    const lawyer = await this.prisma.staffUser.findFirst({
      where: { isLawyer: true },
    });

    //TODO por ahora no hay proceso de evaluacion, toda request se asigna(done) o falla
    if (!lawyer) throw new BadRequestException('Uknow error');

    const company = await this.prisma.company.findFirst({
      where: {
        UserCompany: { some: { User: { id: userId } } },
      },
    });

    //console.log({ company });
    if (!company)
      throw new BadRequestException('This is user isnt part of a company');

    try {
      await this.prisma.chatLawyer.updateMany({
        where: {
          ChatThread: { id: chatThreadId },
          status: ChatLawyerStatus.ACTIVE,
        },
        data: { status: ChatLawyerStatus.FINALIZED },
      });

      //TODO update or change isReqLawyer in chat table

      const chatLawyer = await this.prisma.chatLawyer.create({
        data: {
          ChatThreadId: chatThreadId,
          lawyerId: lawyer.id,
          status: ChatLawyerStatus.ACTIVE,
          statusRequest: ChatbotLawyerReqStatusEnum.done,
          userRequestId: userId,
        },
      });

      await this.prisma.chatCompany.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          lawyerReqStatus: ChatbotLawyerReqStatusEnum.done,
        },
        update: {
          lawyerReqStatus: ChatbotLawyerReqStatusEnum.done,
        },
      });

      await this.notificationService.createStaffNotification(
        notificationTypeEnum.LAWYER_REQUEST,
        notificationCategoryEnum.CHATBOT,
        lawyer.id,
        {
          userClientName: userCompany.name,
          companyName: company.name,
          userOriginId: userId,
          actionRedirectId: chatLawyer.id,
        },
      );

      //save chatThread new type
      await this.prisma.chatThread.update({
        where: { id: chatThreadId },
        data: { chatType: ChatTypeEnum.CHAT_LAWYER },
      });

      //create task

      await this.prisma.task.createMany({
        data: {
          category: TaskCategoryEnum.chatbot,
          dueDate: add(new Date(), { months: 1 }),
          status: TaskStatusEnum.pending,
          typeTask: TaskTypeEnum.encore_task,
          assignedToAdminId: lawyer.id,
          assignedToClientId: null,
          isAssigned: true,
          description: `Chatbot Lawyer request from ${userCompany.name} in ${company.name}`,
          progress: 0,
          stepName: null,
          stepPosition: null,
          taskPosition: null,
          startDate: new Date(),
          companyId: company.id,
        },
      });
    } catch (error) {
      console.error('Error:', error);

      throw new BadRequestException(`Error : ${error.message}`);
    }
  }
  //send a message to chat-<chatThreadId>
  private sendSSE(message: any, chatThreadId: string) {
    //console.log({ message, chatThreadId });
    this.eventEmitter.emit(`chat-${chatThreadId}`, message);
  }

  //connect to chat-<chatThreadId>
  private getSSE(chatThreadId: string): Observable<any> {
    //console.log({ getSSE: chatThreadId });
    return fromEvent(this.eventEmitter, `chat-${chatThreadId}`).pipe(
      map((data: any) => {
        // console.log({ data });
        return new MessageEvent('chat', { data });
      }),
    );
  }
}
