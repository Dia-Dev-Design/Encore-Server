import { ApiProperty } from '@nestjs/swagger';

export class UpdateFolderDto {
  @ApiProperty({
    description: 'The name of the folder',
    required: true,
  })
  name: string;
}
