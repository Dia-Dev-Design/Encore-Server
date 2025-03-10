import { ApiProperty } from '@nestjs/swagger';

export class MoveFolderDto {
  @ApiProperty({
    description: 'The ID of the new parent folder',
    required: true,
  })
  newParentId: string;
}
