import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { DocHubService } from 'src/dochub/services/dochub.service';

export class FileSelectorTool {
  private docHubService: DocHubService;
  public readonly tool: ReturnType<typeof tool>;
  public readonly description: string;

  constructor(docHubService: DocHubService) {
    this.docHubService = docHubService;
    this.description = 'Select the most relevant files for a user query based on document metadata and content.';
    
    const selectorSchema = z.object({
      query: z.string().describe('The user query to find relevant files for'),
      userId: z.string().describe('The ID of the user whose documents to search'),
      maxFiles: z.number().optional().describe('Optional: Maximum number of files to return (default: 3)'),
    });

    this.tool = tool(
      async ({ query, userId, maxFiles = 3}) => {
        try {
          console.log(`[FILE_SELECTOR] Starting file selection for query: "${query}"`);
          
          // Get all user documents
          const userDocs = await this.docHubService.getUserDocuments(userId);
          
          if (userDocs.length === 0) {
            return ['You have not uploaded any documents yet.', []];
          }
          
          // If there's only one document, return it
          if (userDocs.length === 1) {
            return [
              `You have only one document: "${userDocs[0].fileName}". This document will be used for your query.`,
              [userDocs[0]]
            ];
          }
          
          // Extract keywords from the query
          const queryKeywords = query.toLowerCase().split(/\s+/).filter(word => word.length > 3);
          
          // Score each document based on relevance to the query
          const scoredDocs = userDocs.map(doc => {
            let score = 0;
            const fileName = doc.fileName.toLowerCase();
            
            // Check if document name contains query keywords
            queryKeywords.forEach(keyword => {
              if (fileName.includes(keyword)) {
                score += 2; // Higher weight for filename matches
              }
            });
            
            // Check for document type keywords
            const docTypeKeywords = {
              legal: ['legal', 'law', 'contract', 'agreement', 'terms'],
              resume: ['resume', 'cv', 'curriculum vitae'],
              entrepreneur: ['entrepreneur', 'business guide', 'business plan'],
              financial: ['financial', 'tax', 'accounting', 'budget'],
              technical: ['technical', 'specification', 'manual', 'guide'],
            };
            
            for (const [docType, keywords] of Object.entries(docTypeKeywords)) {
              if (keywords.some(keyword => query.toLowerCase().includes(keyword))) {
                if (fileName.includes(docType)) {
                  score += 3; // Even higher weight for document type matches
                }
              }
            }
            
            // Check for recency (newer documents might be more relevant)
            const uploadDate = new Date(doc.createdAt);
            const daysSinceUpload = (new Date().getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpload < 30) {
              score += 1; // Bonus for recent documents
            }
            
            return { doc, score };
          });
          
          // Sort by score and take top N
          const topDocs = scoredDocs
            .sort((a, b) => b.score - a.score)
            .slice(0, maxFiles)
            .map(item => item.doc);
          
          // Format the response
          if (topDocs.length === 0) {
            return ['No relevant documents found for your query.', []];
          }
          
          const fileList = topDocs
            .map((doc, index) => `${index + 1}. ${doc.fileName} (uploaded on ${new Date(doc.createdAt).toLocaleDateString()})`)
            .join('\n');
          
          return [
            `Based on your query, these documents are most relevant:\n\n${fileList}\n\nYou can ask me about any of these documents specifically.`,
            topDocs
          ];
        } catch (error) {
          console.error('[FILE_SELECTOR] Error:', error);
          return ['An error occurred while selecting relevant files.', []];
        }
      },
      {
        name: 'file_selector',
        description: this.description,
        schema: selectorSchema,
        responseFormat: 'content_and_artifact',
      }
    );
  }
} 