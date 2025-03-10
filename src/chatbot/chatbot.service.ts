import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import {
  PGVectorStore,
  DistanceStrategy,
} from '@langchain/community/vectorstores/pgvector';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { tool } from '@langchain/core/tools';
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
import { z } from 'zod';
import dotenv from 'dotenv';
import { PoolConfig } from 'pg';
import pg from 'pg';
import { MessagesAnnotation } from '@langchain/langgraph';
import axios from 'axios';
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

  constructor(private readonly prisma: PrismaService) {
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

  async initializeAgent(fileId: string) {
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
        description: 'Retrieve information related to a query.',
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
          top_p: 0.9,
          search_domain_filter: ['perplexity.ai'],
          return_images: false,
          return_related_questions: false,
          search_recency_filter: 'month',
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
              You are a highly skilled legal assistant with extensive expertise in laws, regulations, and legal principles. Your primary goal is to provide clear, concise, and accurate answers to legal inquiries, ensuring that your responses are appropriate, ethically responsible, and aligned with both local and international laws.

              Your areas of expertise include, but are not limited to:

              Contracts
              Civil rights
              Property law
              Legal disputes
              General legal advice
              While you provide valuable legal insights, you always emphasize that the information provided is for informational purposes only. It should never be construed as a substitute for formal legal advice from a qualified attorney, especially in complex or jurisdiction-specific matters.

              Key Guidelines for Your Responses:
              Ensure Accuracy and Completeness: If the question involves specific legal information or context, always retrieve relevant data first (using the retrieve tool) to ensure your response is precise and complete.
              Real-time Information: If the question requires up-to-date or time-sensitive information (such as legal regulations, court cases, or current laws), use the search tool to gather accurate, real-time data.
              Document Review: If the user uploads any documents related to their legal inquiry, refer to the context from the retrieve tool to offer tailored guidance. If no document is uploaded, inform the user accordingly.
              Clarity in Legal Matters: Provide legal information in a clear, understandable manner, ensuring that even users with little to no legal background can comprehend the basics of their issue.
              In all cases, ensure your answers are ethically sound, professionally written, and based on the latest legal frameworks and principles.
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

  async loadAndProcessDocuments(
    file: Buffer,
    fileId: string,
    threadId: string,
  ) {
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

    const loader = new PDFLoader(new Blob([file]), { parsedItemSeparator: '' });

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, config);

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

  async processPrompt(threadId: string, inputMessage: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: { chatFileId: true, title: true },
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

    await this.initializeAgent(thread.chatFileId);
    const config = {
      configurable: { thread_id: threadId },
      streamMode: 'values' as const,
    };
    const inputs = {
      messages: [new HumanMessage(inputMessage)],
    };

    // Process and generate a response
    for await (const step of await this.agent.stream(inputs, config)) {
      const lastMessage = step.messages[step.messages.length - 1];
      // this.prettyPrint(lastMessage);
      // console.log('lastMessage.content', lastMessage.content);
      if (isAIMessage(lastMessage) && !lastMessage.tool_calls?.length) {
        await this.vectorStore.end();
        return lastMessage.content;
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

  async getHistory(userId: string, threadId: string) {
    try {
      // Verificar si el thread pertenece al usuario
      const thread = await this.prisma.chatThread.findUnique({
        where: { id: threadId, userId },
      });

      if (!thread) {
        throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
      }

      // Obtener los checkpoints ordenados por fecha
      const checkpoints = await this.prisma.checkpoint.findMany({
        where: { thread_id: threadId },
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
        where: { id: threadId, userId },
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
}
