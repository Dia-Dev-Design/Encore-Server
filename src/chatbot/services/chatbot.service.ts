import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  PGVectorStore,
  DistanceStrategy,
} from '@langchain/community/vectorstores/pgvector';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { tool } from '@langchain/core/tools';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  isAIMessage,
  isHumanMessage,
  SystemMessage,
  trimMessages,
} from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatLawyerService } from './chat-lawyer.service';
import { z } from 'zod';
import dotenv from 'dotenv';
import { PoolConfig } from 'pg';
import pg from 'pg';
import { MessagesAnnotation } from '@langchain/langgraph';
import axios from 'axios';
import { UserTypeEnum } from 'src/user/enums/user-type.enum';
import {
  ChatbotLawyerReqStatusEnum,
  ChatLawyerStatus,
  ChatTypeEnum,
} from '../enums/chatbot.enum';
dotenv.config();
const { Pool } = pg;

enum Sentiment {
  GOOD = 'GOOD',
  BAD = 'BAD',
  NEUTRAL = 'NEUTRAL',
}

@Injectable()
export class ChatbotService {
  llm: ChatOpenAI;
  embeddings: OpenAIEmbeddings;
  vectorStore: PGVectorStore;
  agent: ReturnType<typeof createReactAgent>;
  splitter: RecursiveCharacterTextSplitter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatLawyerService: ChatLawyerService,
  ) {
    const config = {
      model: process.env.LANGCHAIN_CHAT_MODEL,
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
      streaming: true,
      embeddingModel: 'text-embedding-3-large',
      chunkSize: 1000,
      chunkOverlap: 200,
    };

    this.llm = new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      apiKey: config.apiKey,
      streaming: config.streaming,
    });

    this.embeddings = new OpenAIEmbeddings({
      model: config.embeddingModel,
      apiKey: config.apiKey,
    });

    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
  }

  async initializeAgent(fileId?: string) {
    const vectorStoreConfig = {
      postgresConnectionOptions: {
        type: 'postgres',
        connectionString: process.env.DATABASE_URL,
      } as PoolConfig,
      tableName: 'vectorstore',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: 'cosine' as DistanceStrategy,
    };

    // Inicializar el vectorStore
    this.vectorStore = await PGVectorStore.initialize(
      this.embeddings,
      vectorStoreConfig,
    );

    const retrieveSchema = z.object({ query: z.string() });
    const retrieve = tool(
      async ({ query }) => {
        const filterParams = fileId ? { file_id: fileId } : {};
        const retrievedDocs = await this.vectorStore.similaritySearch(
          query,
          2,
          filterParams,
        );
        const serialized = retrievedDocs
          .map(
            (doc) =>
              `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`,
          )
          .join('\n');
        return [serialized, retrievedDocs];
      },
      {
        name: 'retrieve',
        description:
          'Retrieve information related to a query from documents uploaded to the chatbot.',
        schema: retrieveSchema,
        responseFormat: 'content_and_artifact',
      },
    );
    const searchSchema = z.object({ query: z.string() });
    const searchTool = tool(
      async ({ query }) => {
        const url = 'https://api.perplexity.ai/chat/completions';
        const token = process.env.PERPLEXITY_API_KEY;

        const data = {
          model: 'sonar-reasoning',
          messages: [
            {
              role: 'system',
              content: 'Be precise and concise.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          max_tokens: null,
          temperature: 0,
          top_p: 0.1,
          search_domain_filter: ['perplexity.ai'],
          return_images: false,
          return_related_questions: false,
          search_recency_filter: 'week',
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1,
          response_format: null,
        };
        try {
          const response = await axios.post(url, data, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          return response.data.choices[0].message.content;
        } catch (error) {
          console.error(
            'Error fetching response:',
            error.response?.data || error.message,
          );
        }
      },
      {
        name: 'search',
        description:
          'Search for updated in realtime information on the web related to a query.',
        schema: searchSchema,
        responseFormat: 'content',
      },
    );
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const checkpointSaver = new PostgresSaver(pool);
    this.agent = await createReactAgent({
      llm: this.llm,
      tools: fileId ? [retrieve, searchTool] : [searchTool],
      checkpointSaver: checkpointSaver,
      stateModifier: async (
        state: typeof MessagesAnnotation.State,
      ): Promise<BaseMessage[]> => {
        return trimMessages(
          [
            new SystemMessage(
              `
              You are a highly skilled legal assistant with in-depth knowledge of laws and regulations.
              Your goal is to provide your answer with clear, concise, and accurate answers to legal inquiries, ensuring that your responses are appropriate, ethically responsible, and aligned with local laws and international legal principles. You offer support in general legal areas such as contracts, civil rights, property, legal disputes, and more. While you are an expert in law, you always emphasize that the information provided does not substitute for the advice of a qualified attorney for complex or specific matters
              The user may require specific information and relevant context, which should first be retrieved using the **retrieve tool**.
              Always use this tool if available before answering to ensure accuracy and completeness in your response. 
              If the user ask for a document or file and there is no information in the context using the **retrieve tool**, answer the user that there is no document or file available in a good way.
              If the question is something about realtime information, use the **search tool** .
              `,
            ),
            ...state.messages,
          ],
          {
            tokenCounter: (msgs) => msgs.length,
            maxTokens: 50000,
            strategy: 'last',
            startOn: 'human',
            includeSystem: true,
            allowPartial: false,
          },
        );
      },
    });
    console.log('ChatbotService has been initialized correctly.');
  }

  prettyPrint(message: BaseMessage) {
    let txt = `[${message.getType()}]: ${message.content}`;
    if ((isAIMessage(message) && message.tool_calls?.length) || 0 > 0) {
      const toolCalls = (message as AIMessage)?.tool_calls
        ?.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)})`)
        .join('\n');
      txt += ` \nTools: \n${toolCalls}`;
    }
    console.log(txt);
  }

  async getThreadById(threadId: string) {
    return this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        ChatCompany: true,
      },
    });
  }

  async loadAndProcessDocuments(
    file: Buffer,
    fileId: string,
    threadId: string,
  ) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      throw new Error('Thread not found');
    }
    await this.prisma.chatThreadFile.create({
      data: {
        chatThreadId: threadId,
        fileId,
      },
    });
    if (thread.chatType === ChatTypeEnum.CHATBOT) {
      const config = {
        postgresConnectionOptions: {
          type: 'postgres',
          connectionString: process.env.DATABASE_URL,
        } as PoolConfig,
        tableName: 'vectorstore',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'vector',
          contentColumnName: 'content',
          metadataColumnName: 'metadata',
        },
        distanceStrategy: 'cosine' as DistanceStrategy,
      };

      const loader = new PDFLoader(new Blob([file]), {
        parsedItemSeparator: '',
      });

      this.vectorStore = await PGVectorStore.initialize(
        this.embeddings,
        config,
      );

      const docs = await loader.load();
      const allSplits = await this.splitter.splitDocuments(docs);

      allSplits.forEach((split) => {
        split.metadata.file_id = fileId;
      });

      console.log(`Split document into ${allSplits.length} sub-documents.`);
      await this.vectorStore.addDocuments(allSplits);
      await this.prisma.chatThread.update({
        where: { id: threadId },
        data: { chatFileId: fileId },
      });
    }
  }

  async processPrompt(
    userId: string,
    threadId: string,
    inputMessage: string,
    fileId: string,
  ) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: { chatFileId: true, title: true, chatType: true },
    });
    if (!thread) {
      throw new Error('Thread not found');
    }

    // Check if thread's title is empty
    if (!thread.title) {
      const titleResponse = await this.llm.invoke(
        '**generate a concise title with this content:** ' + inputMessage,
      );
      const title = String(titleResponse.content).replace(/^"|"$/g, '');
      await this.prisma.chatThread.update({
        where: { id: threadId },
        data: { title },
      });
    }

    if (thread.chatType === ChatTypeEnum.CHAT_LAWYER) {
      await this.chatLawyerService.sendMessage(
        threadId,
        { message: inputMessage, fileId },
        userId,
        UserTypeEnum.USER_COMPANY,
      );
    } else {
      await this.initializeAgent(thread.chatFileId);
      const config = {
        configurable: { thread_id: threadId },
        streamMode: 'values' as const,
      };
      const inputs = { messages: [{ role: 'user', content: inputMessage }] };

      // Process and generate a response
      for await (const step of await this.agent.stream(inputs, config)) {
        const lastMessage = step.messages[step.messages.length - 1];
        // this.prettyPrint(lastMessage);
        if (isAIMessage(lastMessage) && !lastMessage.tool_calls?.length) {
          await this.vectorStore.end();
          return lastMessage.content;
        }
      }
    }
  }

  async createThread(userId: string) {
    try {
      const thread = await this.prisma.chatThread.create({
        data: {
          userId: userId,
        },
      });
      const userCompany = await this.prisma.userCompany.findFirst({
        where: { userId },
      });

      if (!userCompany) {
        throw new HttpException(
          `User Company not found: ${userId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const chatCompany = await this.prisma.chatCompany.upsert({
        where: {
          companyId: userCompany.companyId,
        },
        create: {
          companyId: userCompany.companyId,
          lawyerReqStatus: ChatbotLawyerReqStatusEnum.none,
        },
        update: {},
      });

      await this.prisma.chatThread.update({
        where: { id: thread.id },
        data: { chatCompanyId: chatCompany.id },
      });

      return thread;
    } catch (error) {
      console.error('Error creating thread:', error);

      throw new HttpException(
        `Error creating thread: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getThreads(userId: string) {
    try {
      const threads = await this.prisma.chatThread.findMany({
        where: {
          userId,
        },
      });

      return threads;
    } catch (error) {
      console.error('Error retrieving threads:', error);

      throw new HttpException(
        `Error retrieving threads: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getThread(thread_id: string, userId: string) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          id: thread_id,
          userId,
        },
      });

      return thread;
    } catch (error) {
      console.error('Error retrieving thread:', error);

      throw new HttpException(
        `Error retrieving thread: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateThread(userId: string, threadId: string, title: string) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          id: threadId,
          userId,
        },
      });
      if (!thread) {
        throw new HttpException(
          `Thread not found: ${threadId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.prisma.chatThread.update({
        where: {
          id: threadId,
        },
        data: {
          title,
        },
      });
    } catch (error) {
      console.error('Error updating thread:', error);

      throw new HttpException(
        `Error updating thread: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createCategory(userId: string, name: string) {
    try {
      const category = await this.prisma.chatCategory.create({
        data: {
          userId,
          name,
        },
      });

      return category;
    } catch (error) {
      console.error('Error creating category:', error);

      throw new HttpException(
        `Error creating category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCategory(userId: string, categoryId: string, name: string) {
    try {
      const category = await this.prisma.chatCategory.findUnique({
        where: {
          id: categoryId,
          userId,
        },
      });
      if (!category) {
        throw new HttpException(
          `Category not found: ${categoryId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.prisma.chatCategory.update({
        where: {
          id: categoryId,
        },
        data: {
          name,
        },
      });
    } catch (error) {
      console.error('Error updating category:', error);

      throw new HttpException(
        `Error updating category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCategories(userId: string) {
    try {
      const categories = await this.prisma.chatCategory.findMany({
        where: {
          userId,
        },
      });

      return categories;
    } catch (error) {
      console.error('Error retrieving categories:', error);

      throw new HttpException(
        `Error retrieving categories: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async associateThreadWithCategory(
    userId: string,
    threadId: string,
    categoryId: string,
  ) {
    try {
      const category = await this.prisma.chatCategory.findUnique({
        where: {
          id: categoryId,
          userId,
        },
      });
      if (!category) {
        throw new HttpException(
          `Category not found: ${categoryId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      const existingRelation = await this.prisma.chatThreadCategory.findFirst({
        where: {
          chatThreadId: threadId,
          chatCategoryId: categoryId,
        },
      });

      if (existingRelation) {
        throw new HttpException(
          'Thread is already associated with this category',
          HttpStatus.CONFLICT,
        );
      }

      const response = await this.prisma.chatThreadCategory.create({
        data: {
          chatThreadId: threadId,
          chatCategoryId: categoryId,
        },
      });
      return response;
    } catch (error) {
      console.error('Error associating thread with category:', error);

      throw new HttpException(
        `Error associating thread with category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getThreadsByCategory(userId: string, categoryId: string) {
    try {
      const category = await this.prisma.chatCategory.findUnique({
        where: {
          id: categoryId,
          userId,
        },
      });
      if (!category) {
        throw new HttpException(
          `Category not found: ${categoryId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      const chatThreads = await this.prisma.chatThreadCategory.findMany({
        where: {
          chatCategoryId: categoryId,
        },
        select: {
          chatThreadId: true,
        },
      });

      return chatThreads.map((chatThread) => chatThread.chatThreadId);
    } catch (error) {
      console.error('Error retrieving threads by category:', error);

      throw new HttpException(
        `Error retrieving threads by category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUncategorizedThreads(userId: string) {
    try {
      const threads = await this.prisma.chatThread.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

      const categorizedThreads = await this.prisma.chatThreadCategory.findMany({
        where: {
          chatThreadId: {
            in: threads.map((thread) => thread.id),
          },
        },
        select: {
          chatThreadId: true,
        },
      });
      const uncategorizedThreads = threads.filter(
        (thread) =>
          !categorizedThreads.some(
            (category) => category.chatThreadId === thread.id,
          ),
      );
      return uncategorizedThreads;
    } catch (error) {
      console.error('Error retrieving threads without category:', error);

      throw new HttpException(
        `Error retrieving threads without category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllThreadsAndCategories(userId: string) {
    try {
      const categories = await this.getCategories(userId);
      const threadsByCategory = await Promise.all(
        categories.map(async (category) => {
          const threads = await this.prisma.chatThreadCategory.findMany({
            where: {
              chatCategoryId: category.id,
            },
            select: {
              chatThreadId: true,
            },
          });
          return {
            category,
            threads: await Promise.all(
              threads.map(async (thread) =>
                this.prisma.chatThread.findUnique({
                  where: { id: thread.chatThreadId },
                }),
              ),
            ),
          };
        }),
      );
      const uncategorizedThreads = await this.getUncategorizedThreads(userId);
      return {
        categorized: [...threadsByCategory],
        uncategorized: {
          threads: await Promise.all(
            uncategorizedThreads.map(async (thread) =>
              this.prisma.chatThread.findUnique({
                where: { id: thread.id },
              }),
            ),
          ),
        },
      };
    } catch (error) {
      console.error('Error retrieving all threads and categories:', error);

      throw new HttpException(
        `Error retrieving all threads and categories: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getHistory(userId: string, thread_id: string) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          id: thread_id,
          // userId,
        },
      });

      if (!thread) {
        throw new HttpException(
          `Thread not found: ${thread_id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // const checkpoints = await this.prisma.checkpoint.findMany({
      //   where: {
      //     thread_id: thread_id,
      //   },
      //   orderBy: {
      //     created_at: 'asc',
      //   },
      // });

      // const messages = checkpoints
      //   ?.filter((checkpoint) => {
      //     const source = (checkpoint?.metadata as { source?: string })?.source;
      //     return source === 'input' || source === 'loop';
      //   })
      //   .map((checkpoint) => {
      //     const source = (checkpoint?.metadata as { source?: string })?.source;
      //     const checkpointId = checkpoint.checkpoint_id;
      //     if (source === 'loop') {
      //       const messages = (
      //         checkpoint?.metadata as {
      //           writes?: {
      //             agent?: { messages?: Array<{ kwargs: { content: string } }> };
      //           };
      //         }
      //       )?.writes?.agent?.messages;
      //       if (messages) {
      //         return messages.map((message) => ({
      //           content: message.kwargs.content,
      //           role: 'ai',
      //           checkpoint_id: checkpointId,
      //         }));
      //       }
      //     } else {
      //       const messages = (
      //         checkpoint?.metadata as {
      //           writes?: {
      //             __start__?: { messages?: Array<{ content: string }> };
      //           };
      //         }
      //       )?.writes?.__start__?.messages;
      //       if (messages) {
      //         return messages.map((message) => ({
      //           content: message.content,
      //           role: 'user',
      //           checkpoint_id: checkpointId,
      //         }));
      //       }
      //     }
      //   })
      //   .flat()
      //   .filter((msg) => msg?.content);

      await this.initializeAgent(thread.chatFileId);
      const response = await this.agent.getState({
        configurable: { thread_id },
      });
      const messages =
        response?.values?.messages
          ?.filter((msg) => {
            if (
              isHumanMessage(msg) ||
              (isAIMessage(msg) && !msg.tool_calls?.length)
            ) {
              return msg;
            }
          })
          .map((msg) => {
            if (isHumanMessage(msg)) {
              return {
                id: msg.id,
                role: 'user',
                content: msg.content,
              };
            } else {
              return {
                id: msg.id,
                role: 'ai',
                content: msg.content,
              };
            }
          }) || [];

      // Obtener mensajes de ChatLawyerMessage
      const lawyerMessages = await this.prisma.chatLawyerMessage.findMany({
        where: { ChatThreadId: thread_id },
        orderBy: { createdAt: 'asc' },
      });

      const formattedLawyerMessages = lawyerMessages.map((msg) => ({
        content: msg.content,
        role: msg.userMessageType === 'USER_COMPANY' ? 'user' : 'lawyer',
        id: msg.id,
        createdAt: msg.createdAt,
        fileId: msg.fileId,
      }));

      // Combinar ambos arrays y ordenarlos por fecha de creación
      const allMessages = [...messages, ...formattedLawyerMessages];

      // get all files
      const filesIds = await this.prisma.chatThreadFile.findMany({
        where: { chatThreadId: thread_id },
        orderBy: { createdAt: 'asc' },
        select: { fileId: true },
      });

      const files = await this.prisma.fileReference.findMany({
        where: { id: { in: filesIds.map((file) => file.fileId) } },
      });

      return {
        chatType: thread.chatType,
        files,
        messages: allMessages,
      };
    } catch (error) {
      console.error('Error retrieving history:', error);

      throw new HttpException(
        `Error retrieving history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateCheckpoint(
    userId: string,
    threadId: string,
    checkpointId: string,
    isFavorite: boolean,
    sentiment: Sentiment,
  ) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          id: threadId,
          userId,
        },
      });
      if (!thread) {
        throw new HttpException(
          `Thread not found: ${threadId}`,
          HttpStatus.NOT_FOUND,
        );
      }
      await this.initializeAgent(thread.chatFileId);
      if (isFavorite) {
        await this.prisma.checkpoint.updateMany({
          where: {
            thread_id: threadId,
            checkpoint_id: checkpointId,
          },
          data: {
            is_favorite: true,
          },
        });
      }
      if (sentiment) {
        await this.prisma.checkpoint.updateMany({
          where: {
            thread_id: threadId,
            checkpoint_id: checkpointId,
          },
          data: {
            sentiment,
          },
        });
      }

      const checkpoints = await this.prisma.checkpoint.findMany({
        where: {
          thread_id: threadId,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      const messages = checkpoints
        ?.filter((checkpoint) => {
          const source = (checkpoint?.metadata as { source?: string })?.source;
          return source === 'input' || source === 'loop';
        })
        .map((checkpoint) => {
          const source = (checkpoint?.metadata as { source?: string })?.source;
          const checkpointId = checkpoint.checkpoint_id;
          if (source === 'loop') {
            const messages = (
              checkpoint?.metadata as {
                writes?: {
                  agent?: { messages?: Array<{ kwargs: { content: string } }> };
                };
              }
            )?.writes?.agent?.messages;
            if (messages) {
              return messages.map((message) => ({
                content: message.kwargs.content,
                role: 'ai',
                checkpoint_id: checkpointId,
              }));
            }
          } else {
            const messages = (
              checkpoint?.metadata as {
                writes?: {
                  __start__?: { messages?: Array<{ content: string }> };
                };
              }
            )?.writes?.__start__?.messages;
            if (messages) {
              return messages.map((message) => ({
                content: message.content,
                role: 'user',
                checkpoint_id: checkpointId,
              }));
            }
          }
        })
        .flat()
        .filter((msg) => msg?.content);

      // Obtener mensajes de ChatLawyerMessage
      const lawyerMessages = await this.prisma.chatLawyerMessage.findMany({
        where: { ChatThreadId: threadId },
        orderBy: { createdAt: 'asc' },
      });

      const formattedLawyerMessages = lawyerMessages.map((msg) => ({
        content: msg.content,
        role: msg.userMessageType === 'USER_COMPANY' ? 'user' : 'lawyer',
        id: msg.id,
        createdAt: msg.createdAt,
      }));

      // Combinar ambos arrays y ordenarlos por fecha de creación
      const allMessages = [...messages, ...formattedLawyerMessages];

      return {
        chatType: thread.chatType,
        response: allMessages,
      };
    } catch (error) {
      console.error('Error updating checkpoint:', error);

      throw new HttpException(
        `Error updating checkpoint: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getMessages(
    userId: string,
    threadId: string,
    isFavorite?: boolean,
    sentiment?: Sentiment,
  ) {
    try {
      // Verificar si el thread pertenece al usuario
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          id: threadId,
          // userId,
        },
      });

      if (!thread) {
        throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
      }

      // Obtener los checkpoints ordenados por fecha
      const checkpoints = await this.prisma.checkpoint.findMany({
        where: {
          thread_id: threadId,
          ...(isFavorite !== undefined && { is_favorite: isFavorite }), // Filtro is_favorite
          ...(sentiment && { sentiment }), // Filtro sentiment
        },
        orderBy: { created_at: 'asc' },
      });

      // Extraer mensajes de cada checkpoint
      const messages = checkpoints
        .flatMap((checkpoint) => {
          const metadata = checkpoint.metadata as {
            writes?: {
              agent?: {
                messages?: Array<{ id: string[]; kwargs: { content: string } }>;
              };
              __start__?: {
                messages?: Array<{ id: string[]; kwargs: { content: string } }>;
              };
            };
          };

          const agentMessages = metadata?.writes?.agent?.messages ?? [];
          const startMessages = metadata?.writes?.__start__?.messages ?? [];
          const allMessages = [...agentMessages, ...startMessages];

          return allMessages.map((message) => ({
            id: checkpoint.checkpoint_id, // Usar checkpoint_id como ID
            content: message.kwargs?.content,
            role: message.id?.includes('HumanMessage') ? 'user' : 'ai',
            is_favorite: checkpoint.is_favorite, // Agregar is_favorite del checkpoint
            sentiment: checkpoint.sentiment, // Agregar sentiment del checkpoint
          }));
        })
        .filter((msg) => msg.content); // Filtrar mensajes vacíos

      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new HttpException(
        `Error getting messages: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllThreadsForAdmin(companyId: string, userId: string) {
    try {
      const threads = await this.prisma.chatThread.findMany({
        where: { ChatCompany: { Company: { id: companyId } } },
        orderBy: { createdAt: 'desc' },
      });

      const listThreads = [];
      for (const thread of threads) {
        let isLawyer = false;
        let canWrite = false;
        if (thread.chatType === ChatTypeEnum.CHAT_LAWYER) {
          const chatLawyer = await this.prisma.chatLawyer.findFirst({
            where: {
              ChatThreadId: thread.id,
              status: ChatLawyerStatus.ACTIVE,
              lawyerId: userId,
            },
          });
          if (chatLawyer) {
            isLawyer = true;
            canWrite = true;
          }
        }

        listThreads.push({
          ...thread,
          isLawyer,
          canWrite,
        });
      }

      return listThreads;
    } catch (error) {
      console.error('Error retrieving all threads :', error);

      throw new HttpException(
        `Error retrieving all threads : ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFilesByThread(thread_id: string, userId: string) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: { id: thread_id },
      });

      if (!thread) {
        throw new HttpException(
          `Thread not found: ${thread_id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const files = await this.prisma.chatThreadFile.findMany({
        where: { chatThreadId: thread_id },
        orderBy: { createdAt: 'asc' },
      });

      return files;
    } catch (error) {
      console.error('Error retrieving all threads :', error);

      throw new HttpException(
        `Error retrieving all threads : ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
