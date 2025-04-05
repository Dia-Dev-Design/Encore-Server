import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    try {
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET,
      });
      const payload = jwtService.verify(token);
      // console.log("This is custome decoratoer payload====>", payload)
      return payload.userId; // Return user ID directly
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  },
);
