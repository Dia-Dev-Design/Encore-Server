import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DocHubService } from 'src/dochub/services/dochub.service';
import { Document } from '@langchain/core/documents';

export class DocumentVectorsTool {
  private docHubService: DocHubService;
  public readonly tool: ReturnType<typeof tool>;
  public readonly description: string;

  constructor(docHubService: DocHubService, private readonly userId?: string) {
    this.docHubService = docHubService;
    this.description = 'Retrieve all vector chunks from a specific document for comprehensive analysis.';
    
    const vectorsSchema = z.object({
      fileId: z.string().describe('The ID of the file to retrieve vectors from. This id should be the id in the vector store not the file name.'),
      limit: z.number().optional().describe('Optional: Maximum number of chunks to return (default: 10)'),
      includeMetadata: z.boolean().optional().describe('Optional: Whether to include metadata in the response (default: true)'),
    });

    this.tool = tool(
      async ({ fileId, limit = 10, includeMetadata = true }) => {
        try {
          if (!this.userId) {
            return ['User ID is required to retrieve document vectors.', []];
          }

          console.log(`[DOCUMENT_VECTORS] Retrieving vectors for file: ${fileId}, userId: ${this.userId}`);
          
          // First check if the document exists
          const documentExists = await this.docHubService.checkDocumentExists(fileId);
          
          if (!documentExists) {
            return ['The specified document does not exist or has not been processed yet.', []];
          }
          
          // Get the document chunks
          const chunks = await this.docHubService.getDocumentChunks(fileId, this.userId, limit);
          
          if (!chunks || chunks.length === 0) {
            return ['No vector chunks found for this document. The document may be empty or not properly processed.', []];
          }
          
          // Get document metadata
          const userDocs = await this.docHubService.getUserDocuments(this.userId);
          const docInfo = userDocs.find(doc => doc.fileId === fileId);
          const docName = docInfo ? docInfo.fileName : 'Unknown document';
          
          // Format the chunks for display
          const formattedChunks = chunks.map((chunk, index) => {
            let chunkText = `Chunk ${index + 1}:\n${chunk.pageContent}`;
            
            if (includeMetadata) {
              // Add metadata if available
              const metadata = chunk.metadata;
              if (metadata) {
                chunkText += '\n\nMetadata:';
                if (metadata.page) chunkText += `\n- Page: ${metadata.page}`;
                if (metadata.source) chunkText += `\n- Source: ${metadata.source}`;
                // Add any other relevant metadata
              }
            }
            
            return chunkText;
          }).join('\n\n---\n\n');
          
          // Create a summary of the document
          const summary = `Document: ${docName}\nTotal chunks retrieved: ${chunks.length}\n\n${formattedChunks}`;
          
          return [summary, chunks];
        } catch (error) {
          console.error('[DOCUMENT_VECTORS] Error:', error);
          return ['An error occurred while retrieving document vectors.', []];
        }
      },
      {
        name: 'document_vectors',
        description: this.description,
        schema: vectorsSchema,
        responseFormat: 'content_and_artifact',
      }
    );
  }
} 