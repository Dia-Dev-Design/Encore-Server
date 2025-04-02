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

      // Try to explicitly validate the database connection before creating the saver
      try {
        // Check if the connection is working
        const isDbConnected = await this.databaseService.checkConnection();
        if (!isDbConnected) {
          console.error('Database connection check failed before agent initialization');
          throw new Error('Database connection is not available');
        }

        console.log('Database connection validated before creating PostgresSaver');
      } catch (dbError) {
        console.error('Failed to validate database connection:', dbError);
        throw new HttpException(
          'Cannot initialize chatbot: Database connection failed',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      // Define tools outside of the PostgresSaver creation
      const retrieveSchema = z.object({ query: z.string() });
      const retrieve = tool(
        async ({ query }) => {
          try {
            // Check for multi-document summary requests FIRST (more specific pattern)
            const isMultiDocumentSummaryQuery =
              /summar(y|ize|ies)|overview|all( of)? (my |the )?documents?/i.test(query);

            if (isMultiDocumentSummaryQuery) {
              try {
                console.log(`[RETRIEVE] Handling multi-document summary query`);
                const userDocs = await this.docHubService.getUserDocuments(userId);

                if (userDocs.length === 0) {
                  return ['You have not uploaded any documents yet.', []];
                }

                // Process each document and get summaries
                const documentSummaries = [];
                let allResults: Document[] = [];

                // Process up to 5 documents to avoid overwhelming responses
                const docsToProcess = userDocs.slice(0, 5);

                console.log(`[RETRIEVE] Processing ${docsToProcess.length} documents for summary`);

                for (const doc of docsToProcess) {
                  console.log(`[RETRIEVE] Getting summary for: ${doc.fileName}`);

                  // For each document, get key chunks
                  try {
                    // Get 3 chunks per document - typically first, middle, and end provide good coverage
                    const docResults = await this.docHubService.similaritySearch(
                      'summary overview introduction conclusion',
                      3,
                      { user_id: userId, file_id: doc.fileId }
                    );

                    if (docResults.length > 0) {
                      // Add document metadata to each result
                      docResults.forEach((result) => {
                        result.metadata.documentName = doc.fileName;
                      });

                      // Create document summary entry
                      const docContent = docResults.map((chunk) => chunk.pageContent).join('\n\n');
                      documentSummaries.push({
                        fileName: doc.fileName,
                        content: docContent,
                      });

                      allResults = [...allResults, ...docResults];
                    } else {
                      // If no results from similarity search, try direct retrieval
                      const directChunks = await this.docHubService.getDocumentChunks(
                        doc.fileId,
                        userId,
                        3
                      );

                      if (directChunks && directChunks.length > 0) {
                        directChunks.forEach((result) => {
                          result.metadata.documentName = doc.fileName;
                        });

                        const docContent = directChunks
                          .map((chunk) => chunk.pageContent)
                          .join('\n\n');
                        documentSummaries.push({
                          fileName: doc.fileName,
                          content: docContent,
                        });

                        allResults = [...allResults, ...directChunks];
                      } else {
                        // If still no results, add a placeholder
                        documentSummaries.push({
                          fileName: doc.fileName,
                          content:
                            'This document appears to be empty or contains no extractable text content.',
                        });
                      }
                    }
                  } catch (docError) {
                    console.error(
                      `[RETRIEVE] Error processing document ${doc.fileName}:`,
                      docError
                    );
                    documentSummaries.push({
                      fileName: doc.fileName,
                      content: 'Error retrieving content for this document.',
                    });
                  }
                }

                // Format the results into a user-friendly response
                const formattedSummaries = documentSummaries
                  .map((summary) => `## ${summary.fileName}\n\n${summary.content}`)
                  .join('\n\n---\n\n');

                const responseText = `Here are summaries from your documents:\n\n${formattedSummaries}`;

                return [responseText, allResults];
              } catch (error) {
                console.error(`[RETRIEVE] Error handling multi-document summary:`, error);
                return ['I encountered an error while trying to summarize your documents.', []];
              }
            }

            // Check for different types of document queries SECOND (more general pattern)
            const isGeneralDocumentQuery =
              /what|list|tell|any|documents|files|uploaded|shared|have i/i.test(query);

            if (isGeneralDocumentQuery) {
              try {
                console.log(`[RETRIEVE] Handling general document query`);
                const userDocs = await this.docHubService.getUserDocuments(userId);
                console.log(`[RETRIEVE] Found ${userDocs.length} documents for user ${userId}`);
                console.log(
                  `[RETRIEVE] Documents:`,
                  userDocs.map((d) => d.fileName)
                );

                if (userDocs.length === 0) {
                  return ['You have not uploaded any documents yet.', []];
                }

                // Format the document list with upload dates
                const docList = userDocs
                  .map((doc) => {
                    const uploadDate = new Date(doc.createdAt).toLocaleDateString();
                    return `- ${doc.fileName} (uploaded on ${uploadDate})`;
                  })
                  .join('\n');

                const responseText =
                  userDocs.length === 1
                    ? `You have uploaded one document:\n${docList}\nYou can ask me about this document specifically.`
                    : `You have uploaded the following documents:\n${docList}\nYou can ask me about any of these documents specifically.`;

                return [responseText, []];
              } catch (error) {
                console.error(`[RETRIEVE] Error getting user documents:`, error);
                return ['I was unable to retrieve your document list at this time.', []];
              }
            }

            // 1. Get all the user's documents first
            const userDocs = await this.docHubService.getUserDocuments(userId);
            console.log(
              `[RETRIEVE] Available documents:`,
              userDocs.map((d) => d.fileName)
            );

            // 2. Check if the query specifically mentions any document names
            const queryLower = query.toLowerCase();
            const matchingDocs = [];

            // First try exact filename matching
            for (const doc of userDocs) {
              const fileName = doc.fileName.toLowerCase();
              if (queryLower.includes(fileName)) {
                matchingDocs.push(doc);
                console.log(`[RETRIEVE] Found exact document match: ${doc.fileName}`);
              }
            }

            // If no exact matches, try looser matching (e.g., 'legal' matches 'legal.pdf')
            if (matchingDocs.length === 0) {
              // Check for keywords that might indicate document types
              const documentTypeKeywords = {
                legal: ['legal', 'law', 'contract', 'agreement'],
                resume: ['resume', 'cv', 'curriculum vitae'],
                entrepreneur: ['entrepreneur', 'business', 'guide'],
              };

              // Try matching document types first
              for (const [docType, keywords] of Object.entries(documentTypeKeywords)) {
                if (keywords.some((keyword) => queryLower.includes(keyword))) {
                  // Find documents that might match this type
                  const potentialMatches = userDocs.filter((doc) =>
                    doc.fileName.toLowerCase().includes(docType)
                  );

                  if (potentialMatches.length > 0) {
                    console.log(
                      `[RETRIEVE] Found ${potentialMatches.length} potential matches for "${docType}" document type`
                    );
                    matchingDocs.push(...potentialMatches);
                  }
                }
              }

              // If still no matches, try filename parts
              if (matchingDocs.length === 0) {
                for (const doc of userDocs) {
                  const fileNameWithoutExt = doc.fileName.toLowerCase().split('.')[0];
                  if (queryLower.includes(fileNameWithoutExt)) {
                    matchingDocs.push(doc);
                    console.log(`[RETRIEVE] Found partial document match: ${doc.fileName}`);
                  }
                }
              }
            }

            // 3. If specific documents are mentioned, search only within those documents
            if (matchingDocs.length > 0) {
              console.log(`[RETRIEVE] Found ${matchingDocs.length} documents mentioned in query:`);
              matchingDocs.forEach((doc) => console.log(`- ${doc.fileName} (${doc.fileId})`));

              // Search within each matching document and combine results
              let allResults: Document[] = [];

              for (const doc of matchingDocs) {
                console.log(`[RETRIEVE] Searching within document: ${doc.fileName}`);

                // Create a more targeted search query that's specific to the document content
                // rather than just removing the document name

                // First, extract what the user wants to know about the document
                const documentQuery = query;
                const docNameWithoutExt = doc.fileName.split('.')[0].toLowerCase();

                // Extract what the user wants to know about the document
                // Look for patterns like "tell me about X in the document" or "what does the document say about X"
                const contentPatterns = [
                  /(?:tell|show|give|what).*?(?:about|regarding|concerning)\s+(.+?)(?:\s+in|\s+of|\s+from|\s+within|\s+the|\s+this|\s*$)/i,
                  /(?:what|how|who|when|where|why).*?(?:in|of|from|within|the|this)\s+.*?(?:about|regarding|concerning)\s+(.+?)(?:\s+in|\s+of|\s+from|\s+within|\s+the|\s+this|\s*$)/i,
                  /(?:content|information|details|summary|overview|explanation)\s+(?:of|about|regarding|on|for)\s+(.+?)(?:\s+in|\s+of|\s+from|\s+within|\s+the|\s+this|\s*$)/i,
                ];

                let specificContent = '';
                for (const pattern of contentPatterns) {
                  const match = query.match(pattern);
                  if (match && match[1]) {
                    specificContent = match[1].trim();
                    break;
                  }
                }

                // If we found specific content focus, use it; otherwise use more general terms
                const searchTerms =
                  specificContent ||
                  (queryLower.includes('overview')
                    ? 'overview summary introduction conclusion'
                    : queryLower.includes('content')
                      ? 'content main_points key_sections'
                      : 'main content summary key points');

                const filterParams = {
                  user_id: userId,
                  file_id: doc.fileId,
                };

                // Check if this is an "overall contents" type query (very general)
                if (
                  (queryLower.includes('overall') && queryLower.includes('content')) ||
                  (queryLower.includes('tell') &&
                    queryLower.includes('about') &&
                    !specificContent) ||
                  (queryLower.includes('what') && queryLower.includes('in') && !specificContent) ||
                  (queryLower.startsWith('summarize ') && !specificContent)
                ) {
                  console.log(
                    `[RETRIEVE] Detected general content request for the entire document`
                  );
                  // For overall document requests, use broader search terms but maintain document context
                  let docResults = [];
                  docResults = await this.docHubService.getDocumentChunks(doc.fileId, userId, 5);

                  console.log(
                    `[RETRIEVE] Retrieved ${docResults.length} chunks directly for overall content request`
                  );

                  // If direct chunk retrieval didn't work, fall back to similarity search
                  if (docResults.length === 0) {
                    console.log(`[RETRIEVE] Falling back to similarity search for overall content`);
                    docResults = await this.docHubService.similaritySearch(
                      'introduction overview summary conclusion main points',
                      5,
                      filterParams
                    );
                  }

                  // Add document name to each result's metadata for better context
                  docResults.forEach((result) => {
                    result.metadata.documentName = doc.fileName;
                  });

                  allResults = [...allResults, ...docResults];
                } else {
                  // Standard search process for specific content
                  console.log(`[RETRIEVE] Using document-specific search terms: "${searchTerms}"`);

                  // Try with similarity search first
                  let docResults = [];
                  docResults = await this.docHubService.similaritySearch(
                    searchTerms,
                    5, // Increase from 3 to 5 for better coverage
                    filterParams
                  );

                  console.log(
                    `[RETRIEVE] Found ${docResults.length} results for ${doc.fileName} with similarity search`
                  );

                  // If no results with similarity search, try retrieving chunks directly
                  if (docResults.length === 0) {
                    console.log(
                      `[RETRIEVE] No results found with similarity search, trying direct document retrieval`
                    );

                    try {
                      // Get the raw document content directly
                      const rawDocResults = await this.docHubService.getDocumentChunks(
                        doc.fileId,
                        userId,
                        5
                      );

                      if (rawDocResults && rawDocResults.length > 0) {
                        console.log(
                          `[RETRIEVE] Retrieved ${rawDocResults.length} chunks directly from document`
                        );
                        docResults = rawDocResults;
                      } else {
                        console.log(
                          `[RETRIEVE] Document appears to have no content in the database!`
                        );

                        // Check if the document exists in the database at all
                        const checkResult = await this.docHubService.checkDocumentExists(
                          doc.fileId
                        );
                        console.log(`[RETRIEVE] Document exists check: ${checkResult}`);
                      }
                    } catch (error) {
                      console.error(`[RETRIEVE] Error retrieving raw document chunks:`, error);
                    }
                  }

                  // Add document name to each result's metadata for better context
                  docResults.forEach((result) => {
                    result.metadata.documentName = doc.fileName;
                  });

                  allResults = [...allResults, ...docResults];
                }
              }

              if (allResults.length === 0) {
                return [
                  `I found a document called "${matchingDocs[0].fileName}", but I couldn't extract any content from it. This may happen if the document is empty, contains only images, or hasn't been properly processed.`,
                  [],
                ];
              }

              // Format the results with document names
              const serialized = allResults
                .map(
                  (doc) =>
                    `Source: ${doc.metadata.documentName || doc.metadata.source}\nContent: ${doc.pageContent}`
                )
                .join('\n\n---\n\n');

              return [serialized, allResults];
            }

            // 4. Always include business context with every query
            // First, extract business context from documents
            console.log(`[RETRIEVE] Extracting business context from documents`);
            let businessContext: Document[] = [];

            // Try to find business description documents first (look for keywords in filenames)
            const businessDocKeywords = [
              'company',
              'business',
              'profile',
              'overview',
              'about',
              'description',
            ];
            const potentialBusinessDocs = userDocs.filter((doc) =>
              businessDocKeywords.some((keyword) => doc.fileName.toLowerCase().includes(keyword))
            );

            // If we found potential business context documents, search them first
            if (potentialBusinessDocs.length > 0) {
              console.log(
                `[RETRIEVE] Found ${potentialBusinessDocs.length} potential business context documents`
              );

              for (const doc of potentialBusinessDocs) {
                const contextResults = await this.docHubService.similaritySearch(
                  'business overview description company profile',
                  2,
                  { user_id: userId, file_id: doc.fileId }
                );

                if (contextResults.length > 0) {
                  businessContext = [...businessContext, ...contextResults];
                }
              }
            }

            // If we don't have specific business context yet, try a general search across all documents
            if (businessContext.length === 0) {
              console.log(`[RETRIEVE] Searching all documents for business context`);
              businessContext = await this.docHubService.similaritySearch(
                'business company description overview profile industry sector',
                3,
                { user_id: userId }
              );
            }

            // 5. Now perform the main query search
            console.log(`[RETRIEVE] Searching for query: "${query}"`);
            let documentContext = null;
            if (matchingDocs.length === 0) {
              // Check if query mentions any document type keywords
              const docTypeKeywords = {
                legal: ['legal', 'law', 'contract', 'agreement', 'terms'],
                resume: ['resume', 'cv', 'curriculum vitae'],
                entrepreneur: ['entrepreneur', 'business guide', 'business plan'],
              };

              for (const [docType, keywords] of Object.entries(docTypeKeywords)) {
                if (keywords.some((keyword) => queryLower.includes(keyword))) {
                  // Find the first document that matches this type
                  const match = userDocs.find((doc) =>
                    doc.fileName.toLowerCase().includes(docType)
                  );

                  if (match) {
                    console.log(
                      `[RETRIEVE] Query contains "${docType}" keyword, focusing on document: ${match.fileName}`
                    );
                    documentContext = match;
                    break;
                  }
                }
              }
            } else if (matchingDocs.length === 1) {
              // If we had exactly one matching document but couldn't find anything in it,
              // we should still search only within that document
              documentContext = matchingDocs[0];
              console.log(
                `[RETRIEVE] Maintaining context to document: ${documentContext.fileName}`
              );
            }

            // Check if this is a general content/overview query
            const isOverallContentsQuery =
              (queryLower.includes('overall') && queryLower.includes('content')) ||
              (queryLower.includes('tell') &&
                queryLower.includes('about') &&
                queryLower.includes('document')) ||
              (queryLower.includes('contents') &&
                queryLower.includes('of') &&
                queryLower.includes('document')) ||
              (queryLower.includes('what') &&
                queryLower.includes('in') &&
                queryLower.includes('document'));

            // If this is a general content query and we have a document context, use direct retrieval
            if (isOverallContentsQuery && documentContext) {
              console.log(
                `[RETRIEVE] Detected overall contents query for document: ${documentContext.fileName}`
              );

              // Get chunks directly from the document
              const documentChunks = await this.docHubService.getDocumentChunks(
                documentContext.fileId,
                userId,
                5
              );

              console.log(
                `[RETRIEVE] Retrieved ${documentChunks.length} chunks directly from document`
              );

              if (documentChunks.length > 0) {
                // Add document name to results
                documentChunks.forEach((chunk) => {
                  chunk.metadata.documentName = documentContext.fileName;
                });

                // Format and return the results
                const serialized = documentChunks
                  .map(
                    (doc) =>
                      `Source: ${doc.metadata.documentName || doc.metadata.source}\nContent: ${doc.pageContent}`
                  )
                  .join('\n\n---\n\n');

                return [serialized, documentChunks];
              }
              // If no chunks found, continue with regular search
            }

            // Apply the appropriate filters based on context
            const filterParams = userId
              ? documentContext
                ? { user_id: userId, file_id: documentContext.fileId }
                : { user_id: userId }
              : {};

            console.log(`[RETRIEVE] Applied filter parameters:`, filterParams);
            const retrievedDocs = await this.docHubService.similaritySearch(query, 5, filterParams);

            // 6. Combine the business context with the query results
            let allResults = [...retrievedDocs];

            // Only add business context if it's not already covered in the main query results
            if (businessContext.length > 0) {
              // Add a special marker to identify business context
              businessContext.forEach((doc) => {
                doc.metadata.isBusinessContext = true;
                doc.metadata.contextType = 'business_profile';
              });

              // Check if we should add business context based on overlap
              const shouldAddContext = !retrievedDocs.some((doc) =>
                businessContext.some(
                  (contextDoc) =>
                    doc.pageContent.includes(contextDoc.pageContent) ||
                    contextDoc.pageContent.includes(doc.pageContent)
                )
              );

              if (shouldAddContext) {
                console.log(`[RETRIEVE] Adding ${businessContext.length} business context items`);
                allResults = [...businessContext, ...retrievedDocs];
              }
            }

            if (allResults.length === 0) {
              return [
                "I couldn't find any relevant information in your documents for that query.",
                [],
              ];
            }

            // Add document names to results when possible
            for (const doc of allResults) {
              if (doc.metadata.file_id) {
                const matchingDoc = userDocs.find(
                  (userDoc) => userDoc.fileId === doc.metadata.file_id
                );
                if (matchingDoc) {
                  doc.metadata.documentName = matchingDoc.fileName;
                }
              }
            }

            // Format the results, clearly marking business context
            const serialized = allResults
              .map((doc) => {
                const sourcePrefix = doc.metadata.isBusinessContext
                  ? 'Business Context from'
                  : 'Source';
                return `${sourcePrefix}: ${doc.metadata.documentName || doc.metadata.source}\nContent: ${doc.pageContent}`;
              })
              .join('\n\n---\n\n');

            return [serialized, allResults];
          } catch (error) {
            console.error('Error in retrieve tool:', error);
            return ['No matching documents found.', []];
          }
        },
        {
          name: 'retrieve',
          description:
            'Retrieve information related to a query from documents uploaded by the user, including relevant business context.',
          schema: retrieveSchema,
          responseFormat: 'content_and_artifact',
        }
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
            console.error('Error fetching response:', error.response?.data || error.message);
            return 'Unable to search for information at this time.';
          }
        },
        {
          name: 'search',
          description: 'Search for updated in realtime information on the web related to a query.',
          schema: searchSchema,
          responseFormat: 'content',
        }
      );

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

      this.agent = await createReactAgent({
        llm: this.llm,
        tools: userId ? [retrieve, searchTool] : [searchTool],
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
