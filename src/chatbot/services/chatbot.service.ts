import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
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
import { Document } from '@langchain/core/documents';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatLawyerService } from './chat-lawyer.service';
import { z } from 'zod';
import dotenv from 'dotenv';
import { PoolConfig } from 'pg';
import { MessagesAnnotation } from '@langchain/langgraph';
import axios from 'axios';
import { UserTypeEnum } from 'src/user/enums/user-type.enum';
import { ChatbotLawyerReqStatusEnum, ChatLawyerStatus, ChatTypeEnum } from '../enums/chatbot.enum';
import { DocHubService } from 'src/dochub/services/dochub.service';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { DocumentListTool } from '../tools/document-list.tool';
import { SimilaritySearchTool } from '../tools/similarity-search.tool';
import { FileSelectorTool } from '../tools/file-selector.tool';
import { DocumentVectorsTool } from '../tools/document-vectors.tool';

dotenv.config();

enum Sentiment {
  GOOD = 'GOOD',
  BAD = 'BAD',
  NEUTRAL = 'NEUTRAL',
}

@Injectable()
export class ChatbotService implements OnModuleDestroy, OnModuleInit {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private agent: ReturnType<typeof createReactAgent>;
  private splitter: RecursiveCharacterTextSplitter;
  private initialized = false;

  private agentCache: Map<string, ReturnType<typeof createReactAgent>> = new Map();
  // Track current fileId to avoid unnecessary re-initialization
  private currentFileId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatLawyerService: ChatLawyerService,
    private readonly docHubService: DocHubService,
    private readonly databaseService: DatabaseService
  ) {
    // Constructor now does minimal work, initialization happens lazily
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    const config = {
      model: process.env.LANGCHAIN_CHAT_MODEL || 'gpt-3.5-turbo',
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
      embeddingModel: 'text-embedding-3-small',
      chunkSize: 1000,
      chunkOverlap: 200,
      streaming: true,
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

  async initializeAgent(userId?: string) {
    await this.ensureInitialized();

    // Convert undefined to null for consistent cache key comparison
    const cacheKey = userId || 'default';

    try {
      // If agent for this userId is already cached and connections are alive, return it
      if (this.agentCache.has(cacheKey)) {
        this.agent = this.agentCache.get(cacheKey)!;
        this.currentFileId = cacheKey;
        console.log(`Using cached agent for userId: ${cacheKey}`);
        return;
      }

      console.log(`Initializing new agent for userId: ${cacheKey}`);

      // Check database connection with retry logic
      let connected = false;
      let retries = 3;

      while (!connected && retries > 0) {
        connected = await this.databaseService.checkConnection();
        if (!connected) {
          retries--;
          if (retries > 0) {
            console.log(`Database connection failed, retrying... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      if (!connected) {
        throw new HttpException(
          'Database connection is not available',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Rest of your initialization code

      // Use PostgresSQL connection string directly with saver - with better error handling
      let checkpointSaver;
      try {
        console.log('Creating PostgresSaver with database connection info');
        // Use the shared database pool directly with PostgresSaver
        checkpointSaver = new PostgresSaver(this.databaseService.getPool());
        console.log('PostgresSaver created successfully');
      } catch (saverError) {
        console.error('Failed to create PostgresSaver:', saverError);
        throw new HttpException(
          'Error initializing agent persistence layer',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      const documentListTool = new DocumentListTool(this.docHubService, userId);
      const similaritySearchTool = new SimilaritySearchTool(this.docHubService);
      const fileSelectorTool = new FileSelectorTool(this.docHubService);
      const documentVectorsTool = new DocumentVectorsTool(this.docHubService, userId);

      // Create a tools description string dynamically
      const toolsDescription = `
Available tools:
- document_list: ${documentListTool.description}
- file_selector: ${fileSelectorTool.description}
- document_vectors: ${documentVectorsTool.description}
`;

      this.agent = await createReactAgent({
        llm: this.llm,
        tools: [documentListTool, fileSelectorTool.tool, documentVectorsTool.tool],
        checkpointSaver: checkpointSaver,
        stateModifier: async (state: typeof MessagesAnnotation.State): Promise<BaseMessage[]> => {
          return trimMessages(
            [
              new SystemMessage(
                `You are a highly skilled legal assistant with in-depth knowledge of laws and regulations.

                Your primary goals:
                - Provide clear, concise, and accurate answers to legal inquiries
                - Ensure responses are ethically responsible and jurisdictionally appropriate
                - Maintain professionalism while being accessible to non-lawyers

                You offer support in general legal areas such as contracts, civil rights, property, legal disputes, and more. While your knowledge spans many legal domains, you recognize when questions require specialized expertise.
                
                When responding to legal questions:
                1. If jurisdiction is relevant but not specified, assume the user is in the United States and ask which state and city the question pertains to
                2. Structure your answers with clear distinctions between legal principles, factual information, and your analysis
                3. For specific document or information requests, ALWAYS use the **retrieve tool** first
                4. For questions requiring current information or recent legal developments, use the **search tool**
                5. Clearly indicate when information might vary by jurisdiction
                6. Include appropriate disclaimers when the legal situation is complex or ambiguous

                When handling document-related inquiries:
                1. If the user asks generally about what documents they have shared or uploaded, provide a list of their documents
                2. If the user asks about a specific document by name, search specifically within that document
                3. If the user wants to compare or analyze multiple documents, retrieve information from all relevant documents
                4. Always cite document names when providing information from documents
                5. If a document search returns no results, suggest the user try different keywords or upload relevant documents

                You can use any of the following tools to help you answer the user's question:
                ${toolsDescription}

                Important boundaries:
                - Do NOT provide advice on how to circumvent laws or engage in illegal activities
                - Always emphasize that your information does not substitute for the advice of a qualified attorney
                - Maintain confidentiality and advise users not to share sensitive personal information

                IMPORTANT: Only when providing substantive legal information or answering legal questions, include this disclaimer at the end of your response:
                "As a reminder, the information provided by the Encore AI Chatbot should not be construed as legal advice. If you would like to connect with an attorney to discuss this inquiry further, please click on the 'Ask an Attorney' button in the bottom left of the chat window."
                
                DO NOT include this disclaimer when:
                - Simply listing documents
                - Asking clarifying questions
                - Providing non-legal information
                - Summarizing factual information from documents without legal analysis
                - Responding to general chat or small talk
                `
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
            }
          );
        },
      });

      if (!this.agent) {
        throw new Error('Failed to initialize agent');
      }

      this.agentCache.set(cacheKey, this.agent);
      this.currentFileId = cacheKey;

      console.log(`Agent initialized and cached for userId: ${cacheKey}`);
    } catch (error) {
      console.error(`Error initializing agent for userId ${userId}:`, error);
      throw new HttpException(
        `Error initializing chatbot: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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

  async loadAndProcessDocuments(file: Buffer, fileId: string, threadId: string) {
    await this.ensureInitialized();

    const thread = await this.validateThread(threadId);

    await this.prisma.chatThreadFile.create({
      data: {
        chatThreadId: threadId,
        fileId,
      },
    });

    if (thread.chatType === ChatTypeEnum.CHATBOT) {
      const userId = thread.userId;

      await this.docHubService.processDocument(file, fileId, userId);

      await this.prisma.chatThread.update({
        where: { id: threadId },
        data: { chatFileId: fileId },
      });

      if (this.agentCache.has(userId)) {
        console.log(`Invalidating cached agent for userId: ${userId}`);
        this.agentCache.delete(userId);
      }

      if (this.currentFileId === userId) {
        this.currentFileId = null;
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
      throw new HttpException(`Thread not found: ${threadId}`, HttpStatus.NOT_FOUND);
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

      await this.initializeAgent(userId);

      // Verify agent was properly initialized
      if (!this.agent) {
        console.error('Agent was not properly initialized');
        throw new HttpException(
          'Error initializing chatbot agent',
          HttpStatus.INTERNAL_SERVER_ERROR
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
              if (isHumanMessage(msg) || (isAIMessage(msg) && !msg.tool_calls?.length)) {
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
        this.handleAgentError(error, userId);

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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateCheckpoint(
    userId: string,
    threadId: string,
    checkpointId: string,
    isFavorite: boolean,
    sentiment: Sentiment
  ) {
    await this.ensureInitialized();

    try {
      const thread = await this.validateThread(threadId, userId);

      await this.initializeAgent(userId);

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
        this.handleAgentError(error, userId);
        throw error;
      }
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      throw new HttpException(
        `Error updating checkpoint: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async processPrompt(
    userId: string,
    threadId: string,
    inputMessage: string,
    fileId: string,
    onChunk?: (chunk: string) => void
  ) {
    try {
      await this.ensureInitialized();
      const thread = await this.validateThread(threadId);

      // Check if thread's title is empty
      if (!thread.title) {
        const titleResponse = await this.llm.invoke(
          '**generate a concise title with this content:** ' + inputMessage
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
          UserTypeEnum.USER_COMPANY
        );
      } else {
        await this.initializeAgent(userId);

        if (!this.agent) {
          const error = new Error('Agent initialization failed');
          console.error(error);
          if (onChunk) {
            throw error;
          }
          return;
        }

        const config = {
          configurable: { thread_id: threadId },
          streamMode: 'values' as const,
        };
        const inputs = { messages: [{ role: 'user', content: inputMessage }] };

        try {
          let hasResponse = false;
          let finalContent = '';
          let inToolCallSequence = false;

          for await (const step of await this.agent.stream(inputs, config)) {
            const lastMessage = step.messages[step.messages.length - 1];

            // Modified condition to handle different message types
            if (isAIMessage(lastMessage)) {
              if (lastMessage.tool_calls?.length) {
                // If we have tool calls, log them but don't send to client
                inToolCallSequence = true;
                console.log(
                  `Tool calls detected: ${JSON.stringify(lastMessage.tool_calls.map((tc) => tc.id))}`
                );
                continue;
              }

              if (lastMessage.content) {
                finalContent += lastMessage.content.toString();

                // Only send actual content to the client
                if (lastMessage.content && onChunk) {
                  hasResponse = true;
                  onChunk(lastMessage.content.toString());
                } else if (onChunk) {
                  hasResponse = true;
                  onChunk(finalContent);
                }
              }
            }
          }

          // If we went through the stream but never sent a response, that's an error condition
          if (!hasResponse && onChunk) {
            throw new Error('No response generated from the language model');
          }
        } catch (error) {
          console.error('Error during agent streaming:', error);
          this.handleAgentError(error, userId);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error processing prompt:', error);
      // Only rethrow if we're in streaming mode (onChunk is provided)
      if (onChunk) {
        throw error;
      }
    }
  }

  async streamPrompt(
    userId: string,
    threadId: string,
    inputMessage: string,
    fileId: string,
    onChunk: (chunk: string) => void
  ) {
    return await this.processPrompt(userId, threadId, inputMessage, fileId, onChunk);
  }

  async getFilesByThread(thread_id: string, userId: string) {
    try {
      await this.validateThread(thread_id);
      return this.getThreadFiles(thread_id);
    } catch (error) {
      console.error('Error retrieving thread files:', error);
      throw new HttpException(
        `Error retrieving thread files: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async createThread(userId: string) {
    try {
      // First, make sure userId is not undefined or empty
      if (!userId) {
        throw new BadRequestException('User ID is required to create a chat thread');
      }

      console.log('Creating thread for user ID:', userId); // Add debugging

      const thread = await this.prisma.chatThread.create({
        data: {
          User: {
            connect: {
              id: userId,
            },
          },
        },
      });

      console.log('Thread created:', thread); // Add debugging
      return thread;
    } catch (error) {
      // Handle error appropriately
      console.error('Error creating chat thread:', error);

      // Provide a more descriptive error message
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
      }

      throw new HttpException(
        `Error creating chat thread: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async chatCompany(userCompany: { companyId: string }, thread: { id: string }) {
    try {
      const chatCompanyRecord = await this.prisma.chatCompany.upsert({
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
        data: { chatCompanyId: chatCompanyRecord.id },
      });

      return thread;
    } catch (error) {
      console.error('Error creating thread:', error);

      throw new HttpException(
        `Error creating thread: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        throw new HttpException(`Thread not found: ${threadId}`, HttpStatus.NOT_FOUND);
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        throw new HttpException(`Category not found: ${categoryId}`, HttpStatus.NOT_FOUND);
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async associateThreadWithCategory(userId: string, threadId: string, categoryId: string) {
    try {
      const category = await this.prisma.chatCategory.findUnique({
        where: {
          id: categoryId,
          userId,
        },
      });
      if (!category) {
        throw new HttpException(`Category not found: ${categoryId}`, HttpStatus.NOT_FOUND);
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
          HttpStatus.CONFLICT
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        throw new HttpException(`Category not found: ${categoryId}`, HttpStatus.NOT_FOUND);
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        (thread) => !categorizedThreads.some((category) => category.chatThreadId === thread.id)
      );
      return uncategorizedThreads;
    } catch (error) {
      console.error('Error retrieving threads without category:', error);

      throw new HttpException(
        `Error retrieving threads without category: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
                })
              )
            ),
          };
        })
      );
      const uncategorizedThreads = await this.getUncategorizedThreads(userId);
      return {
        categorized: [...threadsByCategory],
        uncategorized: {
          threads: await Promise.all(
            uncategorizedThreads.map(async (thread) =>
              this.prisma.chatThread.findUnique({
                where: { id: thread.id },
              })
            )
          ),
        },
      };
    } catch (error) {
      console.error('Error retrieving all threads and categories:', error);

      throw new HttpException(
        `Error retrieving all threads and categories: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getMessages(userId: string, threadId: string, isFavorite?: boolean, sentiment?: Sentiment) {
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async closeConnections() {
    try {
      // We no longer need to close the pool since it's managed by DatabaseService
      // Just clear the current fileId
      this.currentFileId = null;
    } catch (error) {
      console.error('Error closing connections:', error);
    }
  }

  // Implement OnModuleDestroy
  async onModuleDestroy() {
    console.log('ChatbotService is being destroyed. Clearing agent cache...');
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
