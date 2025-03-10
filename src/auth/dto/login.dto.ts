import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({
    description: 'The email address used for authentication',
    example: 'user@example.com',
    format: 'email',
    required: true,
  })
  email: string;

  @IsNotEmpty()
  @ApiProperty({
    description: 'The password for authentication',
    example: 'StrongP@ssw0rd',
    minLength: 8,
    required: true,
    writeOnly: true,
  })
  password: string;
}
