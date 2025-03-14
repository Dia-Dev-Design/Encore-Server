import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
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
export class ChatbotService implements OnModuleDestroy, OnModuleInit {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PGVectorStore;
  private agent: ReturnType<typeof createReactAgent>;
  private splitter: RecursiveCharacterTextSplitter;
  private pgPool: pg.Pool | null = null;
  private initialized = false;

  private agentCache: Map<string, ReturnType<typeof createReactAgent>> =
    new Map();
  // Track current fileId to avoid unnecessary re-initialization
  private currentFileId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatLawyerService: ChatLawyerService,
  ) {
    // Constructor now does minimal work, initialization happens lazily
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    const config = {
      model: process.env.LANGCHAIN_CHAT_MODEL || 'gpt-3.5-turbo',
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

    this.initialized = true;
    console.log('ChatbotService base components initialized');
  }

  async initializeAgent(fileId?: string) {
    await this.ensureInitialized();

    // Convert undefined to null for consistent cache key comparison
    const cacheKey = fileId || 'default';

    try {
      // If agent for this fileId is already cached and connections are alive, return it
      if (this.agentCache.has(cacheKey) && this.pgPool && !this.pgPool.ended) {
        this.agent = this.agentCache.get(cacheKey)!;
        this.currentFileId = cacheKey;
        console.log(`Using cached agent for fileId: ${cacheKey}`);
        return;
      }

      console.log(`Initializing new agent for fileId: ${cacheKey}`);

      // Close any existing connections before creating new ones
      await this.closeConnections();

      const vectorStoreConfig = {
        postgresConnectionOptions: {
          type: 'postgres',
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
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

      this.vectorStore = await PGVectorStore.initialize(
        this.embeddings,
        vectorStoreConfig,
      );

      const retrieveSchema = z.object({ query: z.string() });
      const retrieve = tool(
        async ({ query }) => {
          try {
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
          } catch (error) {
            console.error('Error in retrieve tool:', error);
            return ['No matching documents found.', []];
          }
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
            return 'Unable to search for information at this time.';
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

      // Create a new pool
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        max: 30, // maximum number of clients
        min: 5, // keep some connections warm
        idleTimeoutMillis: 60000, // close idle clients after 60 seconds
        connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
      });

      const checkpointSaver = new PostgresSaver(this.pgPool);
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

      // Verify agent was created successfully
      if (!this.agent) {
        throw new Error('Failed to initialize agent');
      }

      // Cache the agent
      this.agentCache.set(cacheKey, this.agent);
      this.currentFileId = cacheKey;

      console.log(`Agent initialized and cached for fileId: ${cacheKey}`);
    } catch (error) {
      console.error(`Error initializing agent for fileId ${fileId}:`, error);
      // Clean up any partial resources
      await this.closeConnections();
      // Propagate the error
      throw new HttpException(
        `Error initializing chatbot: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
    await this.ensureInitialized();

    const thread = await this.validateThread(threadId);

    await this.prisma.chatThreadFile.create({
      data: {
        chatThreadId: threadId,
        fileId,
      },
    });
    if (thread.chatType === ChatTypeEnum.CHATBOT) {
      // Invalidate any cached agent for this file ID
      if (this.agentCache.has(fileId)) {
        console.log(`Invalidating cached agent for fileId: ${fileId}`);
        this.agentCache.delete(fileId);
      }

      // If this is the current file ID, clear it
      if (this.currentFileId === fileId) {
        this.currentFileId = null;
      }

      const config = {
        postgresConnectionOptions: {
          type: 'postgres',
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
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

      try {
        // Close any existing vectorStore
        if (this.vectorStore) {
          await this.vectorStore.end();
        }

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
      } finally {
        // Only close the vectorStore, not the entire connection
        if (this.vectorStore) {
          await this.vectorStore.end();
          this.vectorStore = null;
        }
      }
    }
  }

  /**
   * Validates thread existence and optionally checks user ownership
   */
  private async validateThread(threadId: string, userId?: string) {
    const query: any = { id: threadId };
    if (userId) {
      query.userId = userId;
    }

    const thread = await this.prisma.chatThread.findUnique({
      where: query,
      select: {
        id: true,
        userId: true,
        chatFileId: true,
        title: true,
        chatType: true,
        chatCompanyId: true,
      },
    });

    if (!thread) {
      throw new HttpException(
        `Thread not found: ${threadId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return thread;
  }

  /**
   * Get and format lawyer messages for a thread
   */
  private async getLawyerMessages(threadId: string) {
    const lawyerMessages = await this.prisma.chatLawyerMessage.findMany({
      where: { ChatThreadId: threadId },
      orderBy: { createdAt: 'asc' },
    });

    return lawyerMessages.map((msg) => ({
      content: msg.content,
      role: msg.userMessageType === 'USER_COMPANY' ? 'user' : 'lawyer',
      id: msg.id,
      createdAt: msg.createdAt,
      fileId: msg.fileId,
    }));
  }

  /**
   * Get files associated with a thread
   */
  private async getThreadFiles(threadId: string) {
    const filesIds = await this.prisma.chatThreadFile.findMany({
      where: { chatThreadId: threadId },
      orderBy: { createdAt: 'asc' },
      select: { fileId: true },
    });

    const files = await this.prisma.fileReference.findMany({
      where: { id: { in: filesIds.map((file) => file.fileId) } },
    });

    return files;
  }

  /**
   * Handle errors for agent operations
   */
  private handleAgentError(error: any, fileId: string | null) {
    console.error('Agent error:', error);
    this.agentCache.delete(fileId || 'default');
    this.currentFileId = null;
  }

  async getHistory(userId: string, thread_id: string) {
    await this.ensureInitialized();

    try {
      const thread = await this.validateThread(thread_id);

      // Only initialize agent if needed (different fileId)
      const fileIdToUse = thread.chatFileId || null;
      await this.initializeAgent(fileIdToUse);

      // Verify agent was properly initialized
      if (!this.agent) {
        console.error('Agent was not properly initialized');
        throw new HttpException(
          'Error initializing chatbot agent',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      try {
        const response = await this.agent.getState({
          configurable: { thread_id },
        });

        // Handle case where response might be undefined
        if (!response || !response.values || !response.values.messages) {
          return {
            chatType: thread.chatType,
            files: [],
            messages: [],
          };
        }

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

        // Get lawyer messages
        const formattedLawyerMessages = await this.getLawyerMessages(thread_id);

        // Combine arrays
        const allMessages = [...messages, ...formattedLawyerMessages];

        // Get files
        const files = await this.getThreadFiles(thread_id);

        return {
          chatType: thread.chatType,
          files,
          messages: allMessages,
        };
      } catch (error) {
        console.error('Error getting agent state:', error);
        // Clear cache for this agent on error
        this.handleAgentError(error, fileIdToUse);

        // Return a minimal response with just lawyer messages if available
        const formattedLawyerMessages = await this.getLawyerMessages(thread_id);
        const files = await this.getThreadFiles(thread_id);

        return {
          chatType: thread.chatType,
          files,
          messages: formattedLawyerMessages,
          error: 'Could not retrieve AI messages',
        };
      }
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
    await this.ensureInitialized();

    try {
      const thread = await this.validateThread(threadId, userId);

      // Only initialize agent if needed (different fileId)
      const fileIdToUse = thread.chatFileId || null;
      if (this.currentFileId !== fileIdToUse) {
        await this.initializeAgent(fileIdToUse);
      }

      try {
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
            const source = (checkpoint?.metadata as { source?: string })
              ?.source;
            return source === 'input' || source === 'loop';
          })
          .map((checkpoint) => {
            const source = (checkpoint?.metadata as { source?: string })
              ?.source;
            const checkpointId = checkpoint.checkpoint_id;
            if (source === 'loop') {
              const messages = (
                checkpoint?.metadata as {
                  writes?: {
                    agent?: {
                      messages?: Array<{ kwargs: { content: string } }>;
                    };
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

        // Obtain messages from ChatLawyerMessage
        const formattedLawyerMessages = await this.getLawyerMessages(threadId);

        // Combine both arrays
        const allMessages = [...messages, ...formattedLawyerMessages];

        return {
          chatType: thread.chatType,
          response: allMessages,
        };
      } catch (error) {
        // If we encounter an error, clear cache for this agent
        this.handleAgentError(error, fileIdToUse);
        throw error;
      }
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      throw new HttpException(
        `Error updating checkpoint: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processPrompt(
    userId: string,
    threadId: string,
    inputMessage: string,
    fileId: string,
  ) {
    await this.ensureInitialized();

    const thread = await this.validateThread(threadId);

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
      // Only initialize agent if needed (different fileId)
      const fileIdToUse = thread.chatFileId || null;
      if (this.currentFileId !== fileIdToUse) {
        await this.initializeAgent(fileIdToUse);
      }

      const config = {
        configurable: { thread_id: threadId },
        streamMode: 'values' as const,
      };
      const inputs = { messages: [{ role: 'user', content: inputMessage }] };

      try {
        // Process and generate a response
        for await (const step of await this.agent.stream(inputs, config)) {
          const lastMessage = step.messages[step.messages.length - 1];
          // this.prettyPrint(lastMessage);
          if (isAIMessage(lastMessage) && !lastMessage.tool_calls?.length) {
            return lastMessage.content;
          }
        }
      } catch (error) {
        console.error('Error processing prompt:', error);
        // If we encounter an error, clear cache for this agent
        this.handleAgentError(error, fileIdToUse);
        throw error;
      }
    }
  }

  async getFilesByThread(thread_id: string, userId: string) {
    try {
      await this.validateThread(thread_id);
      return this.getThreadFiles(thread_id);
    } catch (error) {
      console.error('Error retrieving thread files:', error);
      throw new HttpException(
        `Error retrieving thread files: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      return await this.validateThread(thread_id, userId);
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

  async getMessages(
    userId: string,
    threadId: string,
    isFavorite?: boolean,
    sentiment?: Sentiment,
  ) {
    await this.ensureInitialized();

    try {
      // Verify if the thread belongs to the user
      await this.validateThread(threadId, userId);

      // Get checkpoints ordered by date
      const checkpoints = await this.prisma.checkpoint.findMany({
        where: {
          thread_id: threadId,
          ...(isFavorite !== undefined && { is_favorite: isFavorite }), // Filter is_favorite
          ...(sentiment && { sentiment }), // Filter sentiment
        },
        orderBy: { created_at: 'asc' },
      });

      // Extract messages from each checkpoint
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
            id: checkpoint.checkpoint_id, // Use checkpoint_id as ID
            content: message.kwargs?.content,
            role: message.id?.includes('HumanMessage') ? 'user' : 'ai',
            is_favorite: checkpoint.is_favorite, // Add is_favorite from checkpoint
            sentiment: checkpoint.sentiment, // Add sentiment from checkpoint
          }));
        })
        .filter((msg) => msg.content); // Filter empty messages

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

  async closeConnections() {
    try {
      // Close vectorStore connections if it exists
      if (this.vectorStore) {
        await this.vectorStore.end();
        this.vectorStore = null;
      }

      // Close the pg pool if it exists
      if (this.pgPool) {
        await this.pgPool.end();
        this.pgPool = null;
      }

      // Clear the current fileId
      this.currentFileId = null;
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }

  // Implement OnModuleDestroy
  async onModuleDestroy() {
    console.log(
      'ChatbotService is being destroyed. Closing database connections and clearing agent cache...',
    );
    // Clear the agent cache
    this.agentCache.clear();
    await this.closeConnections();
  }

  async onModuleInit() {
    await this.ensureInitialized();
    // Pre-warm the default agent
    await this.initializeAgent();
    console.log('Default agent pre-warmed and ready');
  }
}
