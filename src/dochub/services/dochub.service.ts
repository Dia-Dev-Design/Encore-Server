import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import {
  PGVectorStore,
  DistanceStrategy,
} from '@langchain/community/vectorstores/pgvector';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoolConfig } from 'pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { Document } from '@langchain/core/documents';
import { S3Service } from 'src/s3/s3.service';
dotenv.config();
const { Pool } = pg;

@Injectable()
export class DocHubService implements OnModuleInit, OnModuleDestroy {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PGVectorStore | null = null;
  private splitter: RecursiveCharacterTextSplitter;
  private pgPool: pg.Pool | null = null;
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return;

    const config = {
      embeddingModel: 'text-embedding-3-small',
      apiKey:
        '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',
      chunkSize: 1000,
      chunkOverlap: 200,
    };

    this.embeddings = new OpenAIEmbeddings({
      model: config.embeddingModel,
      apiKey: config.apiKey,
    });

    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });

    const config2 = {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      } as PoolConfig,
      tableName: 'vectorstore',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
      distanceStrategy: 'cosine' as DistanceStrategy,
    };

    this.vectorStore = await PGVectorStore.initialize(this.embeddings, config2);

    this.initialized = true;
    console.log('DocHubService base components initialized');
  }

  async onModuleInit() {
    await this.ensureInitialized();
    console.log('DocHubService initialized');
  }

  async onModuleDestroy() {
    await this.closeConnections();
    console.log('DocHubService destroyed');
  }

  async closeConnections() {
    try {
      if (this.vectorStore) {
        await this.vectorStore.end();
        this.vectorStore = null;
      }

      if (this.pgPool) {
        await this.pgPool.end();
        this.pgPool = null;
      }
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }

  async processDocument(file: Buffer, fileId: string, userId: string) {
    await this.ensureInitialized();

    try {
      await this.prisma.userDocument.create({
        data: {
          userId,
          fileId,
        },
      });

      const loader = new PDFLoader(new Blob([file]), {
        parsedItemSeparator: '',
      });

      const docs = await loader.load();
      const allSplits = await this.splitter.splitDocuments(docs);

      allSplits.forEach((split) => {
        split.metadata.file_id = fileId;
        split.metadata.user_id = userId;
      });

      try {
        await this.vectorStore.addDocuments(allSplits);
        return { success: true, documentCount: allSplits.length };
      } catch (insertError) {
        console.error(
          'Error inserting documents into vector store:',
          insertError,
        );
        throw new Error(`Error inserting: ${insertError.message}`);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      throw new HttpException(
        `Error processing document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserDocuments(userId: string) {
    try {
      const userDocs = await this.prisma.userDocument.findMany({
        where: {
          userId,
          isActive: true,
        },
        include: {
          File: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return userDocs.map((doc) => ({
        id: doc.id,
        fileId: doc.fileId,
        fileName: doc.File.originalName,
        fileType: doc.File.fileType,
        fileSize: doc.File.size,
        key: doc.File.key,
        mimeType: doc.File.mimeType,
        createdAt: doc.createdAt,
      }));
    } catch (error) {
      console.error('Error getting user documents:', error);
      throw new HttpException(
        `Error getting user documents: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserDocument(documentId: string, res: any) {
    try {
      const doc = await this.prisma.userDocument.findUnique({
        where: {
          id: documentId,
          isActive: true,
        },
        include: {
          File: true,
        },
      });

      if (!doc) {
        console.log(`Document not found with ID: ${documentId}`);
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }
      await this.s3Service.getObjectStream(doc.File.key, res);
    } catch (error) {
      console.error('Error getting user document:', error);
      throw new HttpException(
        `Error getting user document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserDocumentsWithUrls(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const documents = await this.getUserDocuments(userId);
    const paginatedDocuments = documents.slice(skip, skip + limit);
    const totalCount = documents.length;
    const keys = paginatedDocuments.map((doc) => doc.key);
    const signedUrls = await this.s3Service.getSignedUrls(keys);
    return {
      data: paginatedDocuments.map((doc, index) => ({
        name: doc.fileName,
        id: doc.id,
        type: doc.fileType,
        url: signedUrls[index],
        size: doc.fileSize,
        createdAt: doc.createdAt,
      })),
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async deleteUserDocument(userId: string, documentId: string) {
    try {
      const document = await this.prisma.userDocument.findFirst({
        where: {
          id: documentId,
          userId,
        },
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.userDocument.update({
        where: { id: documentId },
        data: { isActive: false },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting user document:', error);
      throw new HttpException(
        `Error deleting user document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async similaritySearch(
    query: string,
    k: number = 5,
    filterParams: Record<string, any> = {},
  ): Promise<Document[]> {
    await this.ensureInitialized();

    try {
      console.log(`[DOCHUB] Starting similarity search for query: "${query}"`);
      console.log(`[DOCHUB] Filter parameters:`, filterParams);
      console.log(`[DOCHUB] Number of results requested: ${k}`);
      const config = {
        postgresConnectionOptions: {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
        } as PoolConfig,
        tableName: 'vectorstore',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content',
          metadataColumnName: 'metadata',
        },
        distanceStrategy: 'cosine' as DistanceStrategy,
      };

      console.log('this is the databaseurl', process.env.DATABASE_URL);

      if (this.vectorStore) {
        await this.vectorStore.end();
      }

      this.vectorStore = await PGVectorStore.initialize(
        this.embeddings,
        config,
      );

      try {
        console.log(`[DOCHUB] Executing vector search in database...`);
        const results = await this.vectorStore.similaritySearch(
          query,
          k,
          filterParams,
        );
        console.log(
          `[DOCHUB] Search complete. Found ${results.length} results.`,
        );
        if (results.length > 0) {
          console.log(
            `[DOCHUB] Result metadata sample:`,
            results.map((doc) => ({
              source: doc.metadata.source,
              file_id: doc.metadata.file_id,
              user_id: doc.metadata.user_id,
              content_preview: doc.pageContent.substring(0, 50) + '...',
            })),
          );
        } else {
          console.log(
            `[DOCHUB] No results found for this query with the given filters.`,
          );
        }
        return results;
      } finally {
        if (this.vectorStore) {
          await this.vectorStore.end();
          this.vectorStore = null;
        }
      }
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw new HttpException(
        `Error in similarity search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
