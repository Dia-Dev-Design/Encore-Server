import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsBoolean,
  IsOptional, // Replace IsEmpty with IsOptional if the field is optional
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  password: string;

  @IsBoolean()
  @IsOptional() // This means the field can be omitted in the request
  @ApiProperty({ default: false }) // Documenting a default value
  isAdmin?: boolean; // The ? makes it optional in TypeScript
}
