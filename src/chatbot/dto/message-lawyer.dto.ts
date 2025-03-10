import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageForChatLawyerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  fileId?: string;
}

export class MessageForChatLawyerDto {
  type?: string;
  message: {
    id: string;
    content: string;
    fileId?: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      typeUser: string;
      name: string;
      image?: string;
    };
  };
}
