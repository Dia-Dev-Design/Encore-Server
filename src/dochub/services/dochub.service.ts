import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore, DistanceStrategy } from '@langchain/community/vectorstores/pgvector';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaService } from 'src/prisma/prisma.service';
import { PoolConfig } from 'pg';
import { Document } from '@langchain/core/documents';
import { S3Service } from 'src/s3/s3.service';
import { DatabaseService } from 'src/database/database.service';
import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class DocHubService implements OnModuleInit, OnModuleDestroy {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PGVectorStore | null = null;
  private splitter: RecursiveCharacterTextSplitter;
  private initialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly databaseService: DatabaseService
  ) {}

  private async ensureInitialized() {
    if (this.initialized) return;

    const config = {
      embeddingModel: 'text-embedding-3-small',


      apiKey: process.env.OPENAI_API_KEY,

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
      },
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
    } catch (error) {
      console.error('Error closing vector store connections:', error);
    }
  }

  async processDocument(file: Buffer, fileId: string, userId: string) {
    await this.ensureInitialized();

    try {
      console.log(
        `[DOCHUB] Processing document for user ${userId}, fileId: ${fileId}, size: ${file.length} bytes`
      );

      await this.prisma.userDocument.create({
        data: {
          userId,
          fileId,
        },
      });

      // Create a blob from the buffer
      const blob = new Blob([file]);
      console.log(
        `[DOCHUB] Created blob, size: ${blob.size} bytes, type: ${blob.type || 'unspecified'}`
      );

      const loader = new PDFLoader(blob, {
        parsedItemSeparator: '',
      });

      console.log(`[DOCHUB] Loading PDF content...`);
      const docs = await loader.load();
      console.log(`[DOCHUB] PDF loaded, extracted ${docs.length} pages/sections`);

      if (docs.length === 0) {
        console.warn(
          `[DOCHUB] Warning: No content extracted from PDF. The file might be empty, password-protected, or contain only images.`
        );
      }

      console.log(`[DOCHUB] Splitting documents into chunks...`);
      const allSplits = await this.splitter.splitDocuments(docs);
      console.log(`[DOCHUB] Document split into ${allSplits.length} chunks`);

      if (allSplits.length === 0) {
        console.warn(
          `[DOCHUB] Warning: No chunks created from document. The file might not contain extractable text.`
        );
      }

      allSplits.forEach((split) => {
        split.metadata.file_id = fileId;
        split.metadata.user_id = userId;
      });

      try {
        console.log(`[DOCHUB] Adding ${allSplits.length} chunks to vector store...`);
        await this.vectorStore.addDocuments(allSplits);
        console.log(`[DOCHUB] Successfully added ${allSplits.length} chunks to vector store`);
        return { success: true, documentCount: allSplits.length };
      } catch (insertError) {
        console.error('Error inserting documents into vector store:', insertError);
        throw new Error(`Error inserting: ${insertError.message}`);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      throw new HttpException(
        `Error processing document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserDocuments(userId: string) {
    console.log('This is the userId on getUserDocements', userId);
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserDocument(documentId: string, res?: any) {
    try {
      // First, get all user documents that match this ID
      const userDocs = await this.prisma.userDocument.findMany({
        where: {
          id: documentId,
          isActive: true,
        },
        include: {
          File: true,
        },
      });

      if (!userDocs.length) {
        console.log(`Document not found with ID: ${documentId}`);
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      const doc = userDocs[0];

      // If response object is provided, stream the file
      if (res) {
        await this.s3Service.getObjectStream(doc.File.key, res);
        return null; // No return value needed when streaming
      }

      // Otherwise return document metadata
      return {
        id: doc.id,
        fileId: doc.fileId,
        fileName: doc.File.originalName,
        fileType: doc.File.fileType,
        fileSize: doc.File.size,
        key: doc.File.key,
        mimeType: doc.File.mimeType,
        createdAt: doc.createdAt,
      };
    } catch (error) {
      console.error('Error getting user document:', error);
      throw new HttpException(
        `Error getting user document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCompanyDocument(documentId: string, res?: any) {
    try {
      const fileRef = await this.prisma.fileReference.findUnique({
        where: { id: documentId },
      });

      if (!fileRef) {
        console.error(`Company document not found with ID: ${documentId}`);
        throw new HttpException('Company document not found', HttpStatus.NOT_FOUND);
      }

      // If Express Response is passed, stream the file directly from S3
      if (res) {
        await this.s3Service.getObjectStream(fileRef.key, res);
        return null;
      }

      // Return file metadata if not streaming
      return {
        id: fileRef.id,
        fileName: fileRef.originalName,
        fileType: fileRef.fileType,
        fileSize: fileRef.size,
        key: fileRef.key,
        mimeType: fileRef.mimeType,
        createdAt: fileRef.createdAt,
      };
    } catch (error) {
      console.error('Error getting company document:', error);
      throw new HttpException(
        `Error getting company document: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserDocumentsWithUrls(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const documents = await this.getUserDocuments(userId);
    console.log('These are the documetns from getUser...Urls', documents);
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

  async getCompanyDocumentsWithUrls(companyId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const folders = await this.prisma.folder.findMany({
      where: { companyId },
      select: { id: true },
    });

    const folderIds = folders.map((f) => f.id);

    const fileRefs = await this.prisma.folderFileReference.findMany({
      where: {
        folderId: { in: folderIds },
      },
      include: {
        File: true,
      },
    });

    const paginatedRefs = fileRefs.slice(skip, skip + limit);
    const totalCount = fileRefs.length;

    const keys = paginatedRefs.map((ref) => ref.File.key);
    const signedUrls = await this.s3Service.getSignedUrls(keys);

    return {
      data: paginatedRefs.map((ref, index) => ({
        name: ref.File.originalName || ref.File.key,
        id: ref.File.id,
        type: ref.File.mimeType,
        url: signedUrls[index],
        size: ref.File.size,
        createdAt: ref.File.createdAt,
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUsersByLawyer(lawyerId: string) {
    try {
      const lawyer = await this.prisma.staffUser.findFirst({
        where: {
          id: lawyerId,
        },
      });

      if (!lawyer) {
        throw new HttpException('Lawyer not found or user is not a lawyer', HttpStatus.NOT_FOUND);
      }

      const lawyerUsers = await this.prisma.lawyerUsers.findMany({
        where: { lawyerId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              UserCompany: {
                include: {
                  Company: {
                    select: {
                      name: true
                    }
                  }
                },
                where: {
                  role: 'OWNER'
                },
                take: 1
              }
            },
          },
        },
      });

      return lawyerUsers.map((lu) => ({
        userId: lu.userId,
        name: lu.user.UserCompany[0]?.Company?.name || 'No Company',
        email: lu.user.email,
      }));
    } catch (error) {
      console.error('Error fetching users by lawyer:', error);
      throw new HttpException(
        `Error fetching users by lawyer: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCompaniesByAdmin(adminId: string) {
    try {
      const admin = await this.prisma.staffUser.findFirst({
        where: { id: adminId },
      });

      if (!admin) {
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      }

      const companies = await this.prisma.company.findMany({
        where: { assignedAdminId: adminId },
        select: {
          id: true,
          name: true,
        },
      });

      return companies.map((company) => ({
        companyId: company.id,
        name: company.name,
      }));
    } catch (error) {
      console.error('Error fetching companies by admin:', error);
      throw new HttpException(
        `Error fetching companies by admin: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async similaritySearch(
    query: string,
    k: number = 5,
    filterParams: Record<string, any> = {}
  ): Promise<Document[]> {
    await this.ensureInitialized();

    try {
      console.log(`[DOCHUB] Starting similarity search for query: "${query}"`);
      console.log(`[DOCHUB] Filter parameters:`, filterParams);
      console.log(`[DOCHUB] Number of results requested: ${k}`);

      const pool = this.databaseService.getPool();
      let localVectorStore = null;

      try {
        // Create a new vector store instance for this search operation
        // WITHOUT closing the existing this.vectorStore
        const config = {
          postgresConnectionOptions: {
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false,
            },
            connectionTimeoutMillis: 30000,
            query_timeout: 60000,
          },
          tableName: 'vectorstore',
          columns: {
            idColumnName: 'id',
            vectorColumnName: 'embedding',
            contentColumnName: 'content',
            metadataColumnName: 'metadata',
          },
          distanceStrategy: 'cosine' as DistanceStrategy,
        };

        console.log(`[DOCHUB] Creating vector store instance for search operation`);
        localVectorStore = await PGVectorStore.initialize(this.embeddings, config);

        console.log(`[DOCHUB] Executing vector search in database...`);
        const results = await localVectorStore.similaritySearch(query, k, filterParams);
        console.log(`[DOCHUB] Search complete. Found ${results.length} results.`);

        if (results.length > 0) {
          console.log(
            `[DOCHUB] Result metadata sample:`,
            results.map((doc) => ({
              source: doc.metadata.source,
              file_id: doc.metadata.file_id,
              user_id: doc.metadata.user_id,
              content_preview: doc.pageContent.substring(0, 50) + '...',
            }))
          );

          // If we have a file_id filter, verify results match the expected file_id
          if (filterParams.file_id) {
            const filteredResults = results.filter(
              (doc) => doc.metadata.file_id === filterParams.file_id
            );

            if (filteredResults.length === 0) {
              console.warn(
                `[DOCHUB] Warning: No results matched the requested file_id: ${filterParams.file_id}`
              );
            } else if (filteredResults.length < results.length) {
              console.log(
                `[DOCHUB] Filtered results from ${results.length} to ${filteredResults.length} to match file_id: ${filterParams.file_id}`
              );
              return filteredResults;
            }
          }
        } else {
          console.log(`[DOCHUB] No results found for this query with the given filters.`);
        }

        return results;
      } finally {
        // Only close the local vector store instance created for this operation
        if (localVectorStore) {
          try {
            console.log(`[DOCHUB] Closing search-specific vector store instance`);
            await localVectorStore.end();
          } catch (closeError) {
            console.error(`[DOCHUB] Error closing vector store instance:`, closeError);
            // Don't throw here, as we still want to return results if we have them
          }
        }
      }
    } catch (error) {
      console.error('Error in similarity search:', error);
      throw new HttpException(
        `Error in similarity search: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Add a new method that can find documents by name
  async findDocumentByName(userId: string, fileName: string) {
    try {
      const userDocs = await this.getUserDocuments(userId);

      // Find the first document whose name includes the search term
      const matchingDoc = userDocs.find((doc) =>
        doc.fileName.toLowerCase().includes(fileName.toLowerCase())
      );

      return matchingDoc || null;
    } catch (error) {
      console.error('Error finding document by name:', error);
      throw new HttpException(
        `Error finding document by name: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Retrieve chunks from a document without using similarity search
   * @param fileId The file ID
   * @param userId The user ID
   * @param limit Maximum number of chunks to retrieve
   * @returns Array of document chunks
   */
  async getDocumentChunks(fileId: string, userId: string, limit: number = 10): Promise<Document[]> {
    await this.ensureInitialized();

    try {
      console.log(`[DOCHUB] Retrieving raw chunks for file: ${fileId}, user: ${userId}`);

      const pool = this.databaseService.getPool();

      try {
        // Query to get document chunks by file_id and user_id without vector similarity
        const result = await pool.query(
          `SELECT content, metadata 
           FROM vectorstore 
           WHERE metadata->>'file_id' = $1 
           AND metadata->>'user_id' = $2
           LIMIT $3`,
          [fileId, userId, limit]
        );

        console.log(`[DOCHUB] Retrieved ${result.rows.length} raw chunks`);

        // Convert to Document objects
        return result.rows.map((row) => {
          return new Document({
            pageContent: row.content,
            metadata: row.metadata,
          });
        });
      } catch (error) {
        console.error('Error querying document chunks:', error);
        return [];
      }
    } catch (error) {
      console.error('Error retrieving document chunks:', error);
      return [];
    }
  }

  /**
   * Check if a document exists in the vector database
   * @param fileId The file ID to check
   * @returns Boolean indicating if document exists
   */
  async checkDocumentExists(fileId: string): Promise<boolean> {
    try {
      console.log(`[DOCHUB] Checking if document exists: ${fileId}`);

      const pool = this.databaseService.getPool();

      try {
        // Query to check if any rows exist with this file_id
        const result = await pool.query(
          `SELECT COUNT(*) 
           FROM vectorstore 
           WHERE metadata->>'file_id' = $1`,
          [fileId]
        );

        const count = parseInt(result.rows[0].count);
        console.log(`[DOCHUB] Document ${fileId} has ${count} chunks in database`);

        return count > 0;
      } catch (error) {
        console.error('Error checking document existence:', error);
        return false;
      }
    } catch (error) {
      console.error('Error checking document existence:', error);
      return false;
    }
  }

  /**
   * Debug method to verify the status of documents in the vector database
   * @param userId The user ID to check documents for
   * @returns Diagnostic information about each document
   */
  async checkDocumentsVectorization(userId: string): Promise<any> {
    try {
      console.log(`[DOCHUB] Running vectorization check for user: ${userId}`);

      // Get all user documents
      const userDocs = await this.getUserDocuments(userId);
      const results = [];

      const pool = this.databaseService.getPool();

      try {
        // Check each document
        for (const doc of userDocs) {
          // Query to count chunks for this document
          const result = await pool.query(
            `SELECT COUNT(*) FROM vectorstore WHERE metadata->>'file_id' = $1`,
            [doc.fileId]
          );

          const chunkCount = parseInt(result.rows[0].count);

          // Get a sample chunk if available
          let sampleChunk = null;
          if (chunkCount > 0) {
            const sampleResult = await pool.query(
              `SELECT content, metadata FROM vectorstore WHERE metadata->>'file_id' = $1 LIMIT 1`,
              [doc.fileId]
            );
            sampleChunk = sampleResult.rows[0];
          }

          results.push({
            fileName: doc.fileName,
            fileId: doc.fileId,
            fileType: doc.fileType,
            uploadDate: doc.createdAt,
            vectorized: chunkCount > 0,
            chunkCount,
            sampleChunk: sampleChunk
              ? {
                  contentPreview: sampleChunk.content.substring(0, 100) + '...',
                  metadata: sampleChunk.metadata,
                }
              : null,
          });

          console.log(
            `[DOCHUB] Document "${doc.fileName}" (${doc.fileId}): ${chunkCount} chunks found`
          );
        }

        return results;
      } catch (error) {
        console.error('Error in vectorization check query:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error checking documents vectorization:', error);
      throw new HttpException(
        `Error checking documents vectorization: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
