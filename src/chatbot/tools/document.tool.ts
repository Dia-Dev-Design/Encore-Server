// src/chatbot/tools/document.tool.ts

import { Tool } from '@langchain/core/tools';
import { DocHubService } from 'src/dochub/services/dochub.service';



export class DocumentRetrievalTool extends Tool {
  name = 'document_retrieval';
  description = 'Use this tool to retrieve and search through user documents. Input should be a JSON string with query and optional documentName.';

  constructor(private readonly docHubService: DocHubService, private readonly userId?: string) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { query, documentName } = params;

      // Check for general document listing query
      const isGeneralDocumentQuery = /what|list|tell|any|documents|files|uploaded|shared|have i/i.test(query);

      if (isGeneralDocumentQuery) {
        const userDocs = await this.docHubService.getUserDocuments(this.userId);
        
        if (userDocs.length === 0) {
          return 'You have not uploaded any documents yet.';
        }

        const docList = userDocs
          .map((doc) => {
            const uploadDate = new Date(doc.createdAt).toLocaleDateString();
            return `- ${doc.fileName} (uploaded on ${uploadDate})`;
          })
          .join('\n');

        return userDocs.length === 1
          ? `You have uploaded one document:\n${docList}\nYou can ask me about this document specifically.`
          : `You have uploaded the following documents:\n${docList}\nYou can ask me about any of these documents specifically.`;
      }

      // Handle document search
      const userDocs = await this.docHubService.getUserDocuments(this.userId);
      let matchingDocs = [];

      if (documentName) {
        const specifiedDoc = userDocs.find(
          doc => doc.fileName.toLowerCase() === documentName.toLowerCase()
        );
        if (specifiedDoc) matchingDocs.push(specifiedDoc);
      }

      if (matchingDocs.length === 0) {
        const queryLower = query.toLowerCase();
        matchingDocs = userDocs.filter(doc => 
          queryLower.includes(doc.fileName.toLowerCase())
        );
      }

      let allResults = [];
      if (matchingDocs.length > 0) {
        for (const doc of matchingDocs) {
          const results = await this.docHubService.similaritySearch(
            query,
            3,
            { user_id: this.userId, file_id: doc.fileId }
          );
          results.forEach(r => r.metadata.documentName = doc.fileName);
          allResults.push(...results);
        }
      } else {
        allResults = await this.docHubService.similaritySearch(
          query,
          5,
          { user_id: this.userId }
        );
      }

      if (allResults.length === 0) {
        return "I couldn't find any relevant information in your documents for that query.";
      }

      return allResults
        .map(doc => `Source: ${doc.metadata.documentName || doc.metadata.source}\nContent: ${doc.pageContent}`)
        .join('\n\n---\n\n');

    } catch (error) {
      console.error('Error in document retrieval tool:', error);
      return 'Sorry, I encountered an error while searching through the documents.';
    }
  }
}