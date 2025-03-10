import { ApiProperty } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({
    description: 'The name of the folder',
    required: true,
  })
  name: string;

  @ApiProperty({
    description: 'The ID of the parent folder, if any',
    required: false,
  })
  parentId?: string;
}
