import { Tool } from '@langchain/core/tools';
import { DocHubService } from 'src/dochub/services/dochub.service';

export class DocumentListTool extends Tool {
  name = 'document_list';
  description = 'Use this tool to get a list of all documents the user has uploaded. No input parameters required.';

  constructor(private readonly docHubService: DocHubService, private readonly userId?: string) {
    super();
  }

  protected async _call(_input: string): Promise<string> {
    try {
      const userDocs = await this.docHubService.getUserDocuments(this.userId);
      
      if (userDocs.length === 0) {
        return 'You have not uploaded any documents yet.';
      }

      const docList = userDocs
        .map((doc) => {
          const uploadDate = new Date(doc.createdAt).toLocaleDateString();
          const fileSize = this.formatFileSize(doc.fileSize);
          return `- ${doc.fileName} (ID: ${doc.fileId}, Type: ${doc.fileType}, Size: ${fileSize}, Uploaded: ${uploadDate})`;
        })
        .join('\n');

      return userDocs.length === 1
        ? `You have uploaded one document:\n\n${docList}\n\nYou can ask me about this document specifically.`
        : `You have uploaded the following documents:\n\n${docList}\n\nYou can ask me about any of these documents specifically.`;
    } catch (error) {
      console.error('Error in document list tool:', error);
      return 'Sorry, I encountered an error while retrieving your document list.';
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 