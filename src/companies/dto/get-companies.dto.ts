import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '../../types/pagination';
import { ChatbotLawyerReqStatusEnum } from '../../chatbot/enums/chatbot.enum';

export class Company {
  @ApiProperty({
    description: 'Company ID',
    example: '12345',
  })
  id: string;

  @ApiProperty({
    description: 'Key, same as company id',
    example: 'company-12345',
  })
  key: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Innovations LLC',
  })
  name: string;

  @ApiProperty({
    description: 'Company status',
    example: 'Active',
  })
  status: string;

  @ApiProperty({
    description: 'Company current stage',
    example: 'Growth',
  })
  currentStage: string;

  @ApiProperty({
    description: 'Company assigned to',
    example: { id: 'user-123', name: 'John Doe' },
  })
  assignedTo: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Company states',
    example: ['California', 'New York'],
  })
  states: string[];

  @ApiProperty({
    description: 'Company progress',
    example: 75,
  })
  progress: number;

  @ApiProperty({
    description: 'Company created at',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Company updated at',
    example: '2023-01-10T00:00:00Z',
  })
  updatedAt: Date;

  task?: any;

  services?: any;

  //chatbot
  chatbotStatus?: ChatbotLawyerReqStatusEnum | string;
  chatbotLastTopic: string;
  chatbotDate: Date;
  chatbotHasRequest: boolean;
}

export class GetCompaniesDto {
  @ApiProperty({
    description: 'Companies',
  })
  data: Company[];

  @ApiProperty({
    description: 'Pagination',
  })
  pagination: PaginationResponse;
}
