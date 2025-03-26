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
import { EmailService } from '../../email/email.service';

@Injectable()
export class ChatLawyerService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationsService,
    private readonly emailService: EmailService,
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
    console.log('userType', userType);
    if (
      userType === UserTypeEnum.USER_COMPANY ||
      userType === UserTypeEnum.USER_LAWYER
    ) {
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

      console.log({ userStaff });
      if (!userStaff) throw new NotFoundException('user not found');

      // For admin users, always allow access
      if (userStaff.isLawyer === true) {
        isInChat = true;
        console.log(
          `Admin user ${userStaff.name} (${userId}) granted SSE access to chat ${chatThreadId}`,
        );
      } else {
        // For regular staff, check for active relation
        const chatLawyer = await this.prisma.chatLawyer.findFirst({
          where: {
            ChatThreadId: chatThreadId,
            lawyerId: userStaff.id,
            status: ChatLawyerStatus.ACTIVE,
          },
        });

        if (chatLawyer) {
          isInChat = true;
        }
      }
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
      include: {
        User: true,
      },
    });
    if (!chat) throw new NotFoundException('chat not found');

    //Find user
    let userCompany = null;
    let userStaff = null;
    let isInChat = false;
    let userResponseId = null;
    let userResponseName = null;
    let isAdmin = false;

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

      // Check if user is an admin
      isAdmin = userStaff.isAdmin === true;

      // For admins, always allow access to chat
      if (isAdmin) {
        isInChat = true;
        console.log(
          `Admin user ${userStaff.name} (${userId}) granted access to chat ${chatThreadId}`,
        );
      } else {
        // For regular lawyers, check for an active ChatLawyer record
        const chatLawyer = await this.prisma.chatLawyer.findFirst({
          where: {
            ChatThreadId: chatThreadId,
            lawyerId: userStaff.id,
            status: ChatLawyerStatus.ACTIVE,
          },
        });
        if (chatLawyer) isInChat = true;
      }

      userResponseId = userStaff.id;
      userResponseName = userStaff.name;
    }

    //console.log({ isInChat });

    if (!isInChat)
      throw new BadRequestException('you cant send a message in this chat');

    //-----

    // If admin is messaging for the first time, create a ChatLawyer record
    if (isAdmin && userStaff) {
      // Check if there's already any ChatLawyer record for this thread
      const existingChatLawyer = await this.prisma.chatLawyer.findFirst({
        where: {
          ChatThreadId: chatThreadId,
          lawyerId: userStaff.id,
        },
      });

      // If no record exists, create one
      if (!existingChatLawyer) {
        console.log(
          `Creating ChatLawyer record for admin ${userStaff.name} in chat ${chatThreadId}`,
        );

        try {
          await this.prisma.chatLawyer.create({
            data: {
              ChatThreadId: chatThreadId,
              lawyerId: userStaff.id,
              status: ChatLawyerStatus.ACTIVE,
              statusRequest: ChatbotLawyerReqStatusEnum.done,
              userRequestId: chat.userId, // Use the chat owner as requester
            },
          });

          // Ensure chat is marked as lawyer chat type
          if (chat.chatType !== ChatTypeEnum.CHAT_LAWYER) {
            await this.prisma.chatThread.update({
              where: { id: chatThreadId },
              data: { chatType: ChatTypeEnum.CHAT_LAWYER },
            });
          }
        } catch (error) {
          console.error('Error creating ChatLawyer record:', error);
          // Continue anyway - don't block the message
        }
      }
    }

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

    // Create the SSE message
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

    // Send the SSE event
    this.sendSSE(message, chatThreadId);

    // If a lawyer/staff is responding to a user, send an email notification to the user
    if (userType === UserTypeEnum.USER_STAFF && userStaff && chat.User) {
      // This is a lawyer/staff responding to a user
      await this.emailService.sendLawyerResponseNotificationEmail(
        chat.User.email,
        chat.User.name,
        userStaff.name
      );
    }

    return {
      success: true,
      message: newMessage,
    };
  }

  async requestLawyer(userId: string, chatThreadId: string) {
    const chat = await this.prisma.chatThread.findFirst({
      where: { id: chatThreadId },
    });
    console.log("userId", userId);
    if (!chat) throw new NotFoundException('chat not found');

    const userCompany = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    if (!userCompany) throw new NotFoundException('user not found');

    console.log("chat.userId", chat.userId);

    const isInChat = chat.userId === userId;
    if (!isInChat)
      throw new BadRequestException('you cant request a lawyer in this chat');

    const lawyersWithChatCounts = await this.prisma.staffUser.findMany({
      where: { isLawyer: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            ChatLawyer: {
              where: { status: ChatLawyerStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (lawyersWithChatCounts.length === 0) {
      throw new BadRequestException('No lawyers available in the system');
    }

    const lawyer = lawyersWithChatCounts.reduce(
      (min, current) =>
        current._count.ChatLawyer < min._count.ChatLawyer ? current : min,
      lawyersWithChatCounts[0],
    );

    const company = await this.prisma.company.findFirst({
      where: {
        UserCompany: { some: { User: { id: userId } } },
      },
    });

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


      await this.emailService.sendLawyerChatRequestEmail(
        userCompany.email,
        userCompany.name,
      );


      await this.emailService.sendLawyerNotificationEmail(
        lawyer.email,
        userCompany.name,
        company.name,
        chatThreadId,
      );

      //save chatThread new type
      await this.prisma.chatThread.update({
        where: { id: chatThreadId },
        data: { chatType: ChatTypeEnum.CHAT_LAWYER },
      });

      await this.prisma.lawyerUsers.create({
        data: {
          userId: userId,
          lawyerId: lawyer.id,
          chatId: chatThreadId,
        },
      });

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

  async sendAdminMessage(
    chatThreadId: string,
    payload: CreateMessageForChatLawyerDto,
    adminUserId: string,
  ) {
    console.log(
      `Admin ${adminUserId} sending message to chat ${chatThreadId}: ${payload.message}`,
    );

    // Verify the admin user exists
    const admin = await this.prisma.staffUser.findUnique({
      where: { id: adminUserId },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const userName = admin.name || 'Admin';

    // Get the chat thread
    const chat = await this.prisma.chatThread.findUnique({
      where: { id: chatThreadId },
      include: {
        User: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat thread not found');
    }

    try {
      // Ensure the chat is marked as lawyer chat type
      if (chat.chatType !== ChatTypeEnum.CHAT_LAWYER) {
        await this.prisma.chatThread.update({
          where: { id: chatThreadId },
          data: { chatType: ChatTypeEnum.CHAT_LAWYER },
        });
      }

      // Create or update ChatLawyer record linking admin to this chat
      const existingChatLawyer = await this.prisma.chatLawyer.findFirst({
        where: {
          ChatThreadId: chatThreadId,
          lawyerId: adminUserId,
        },
      });

      if (!existingChatLawyer) {
        await this.prisma.chatLawyer.create({
          data: {
            ChatThreadId: chatThreadId,
            lawyerId: adminUserId,
            status: ChatLawyerStatus.ACTIVE,
            statusRequest: ChatbotLawyerReqStatusEnum.done,
            userRequestId: chat.userId,
          },
        });
      }

      // Create the message
      const newMessage = await this.prisma.chatLawyerMessage.create({
        data: {
          content: payload.message,
          userMessageType: UserTypeEnum.USER_STAFF,
          ChatThreadId: chatThreadId,
          lawyerId: adminUserId,
          userId: chat.userId,
          fileId: payload.fileId,
        },
      });

      // Create the SSE message
      const message: MessageForChatLawyerDto = {
        type: ChatTypeEnum.CHAT_LAWYER,
        message: {
          content: payload.message,
          id: newMessage.id,
          fileId: payload.fileId,
          createdAt: newMessage.createdAt,
          updatedAt: newMessage.updatedAt,
          user: {
            id: adminUserId,
            typeUser: UserTypeEnum.USER_STAFF,
            name: userName,
          },
        },
      };

      // Send the SSE event
      this.sendSSE(message, chatThreadId);
      
      // Send email notification to the user about the lawyer's response
      if (chat.User) {
        await this.emailService.sendLawyerResponseNotificationEmail(
          chat.User.email,
          chat.User.name,
          userName
        );
      }

      return {
        success: true,
        message: newMessage,
      };
    } catch (error) {
      console.error('Error sending admin message:', error);
      throw new BadRequestException(`Error sending message: ${error.message}`);
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
