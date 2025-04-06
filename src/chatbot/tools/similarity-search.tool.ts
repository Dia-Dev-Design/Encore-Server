import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DocHubService } from 'src/dochub/services/dochub.service';
import { Document } from '@langchain/core/documents';

export class SimilaritySearchTool {
  private docHubService: DocHubService;
  private userId: string;
  public readonly tool: ReturnType<typeof tool>;
  public readonly description: string;

  constructor(docHubService: DocHubService, userId: string) {
    this.docHubService = docHubService;
    this.userId = userId;
    this.description = 'Search for similar content across user documents using semantic similarity.';
    
    const searchSchema = z.object({
      query: z.string().describe('The search query to find similar content'),
      k: z.number().optional().describe('Optional: Number of results to return (default: 5)'),
    });

    this.tool = tool(
      async ({ query, k = 5 }) => {
        try {
          console.log(`[SIMILARITY_SEARCH] Starting search for query: "${query}" for user: ${this.userId}`);
          
          // Prepare filter parameters
          const filterParams: Record<string, any> = {
            user_id: this.userId,
          };

          // Perform similarity search
          const results = await this.docHubService.similaritySearch(query, k, filterParams);
          
          if (results.length === 0) {
            return ['No relevant content found for your query.', []];
          }

          // Format results with document names and content
          const formattedResults = results.map((doc: Document) => {
            const source = doc.metadata.documentName || doc.metadata.source || 'Unknown source';
            return `Source: ${source}\nContent: ${doc.pageContent}`;
          }).join('\n\n---\n\n');

          return [formattedResults, results];
        } catch (error) {
          console.error('[SIMILARITY_SEARCH] Error:', error);
          return ['An error occurred while searching for similar content.', []];
        }
      },
      {
        name: 'similarity_search',
        description: this.description,
        schema: searchSchema,
        responseFormat: 'content_and_artifact',
      }
    );
  }
} 