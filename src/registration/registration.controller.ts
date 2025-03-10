import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Step1Dto } from './dto/step1.dto';
import { RegistrationService } from './registration.service';
import { Step2Dto } from './dto/step2.dto';
import { Step3Dto } from './dto/step3.dto';
import { User } from 'src/auth/decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';
@ApiTags('register')
@Controller('register')
export class RegistrationController {
  constructor(private readonly registerService: RegistrationService) {}

  @Post('step1')
  @ApiOperation({
    summary: 'Complete registration step 1',
    description:
      'Submit basic company information for the first registration step',
  })
  @ApiBody({ type: Step1Dto })
  @ApiResponse({
    status: 201,
    description: 'Step 1 completed successfully',
    type: Step1Dto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async step1(@User() user: UserEntity, @Body() body: Step1Dto) {
    return this.registerService.registerStep1(user, body);
  }

  @Get('step1/:companyId')
  @ApiOperation({
    summary: 'Get step 1 data',
    description: 'Retrieve the submitted data for registration step 1',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID of the company to retrieve step 1 data for',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Step 1 data retrieved successfully',
    type: Step1Dto,
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async getStep1(
    @User() user: UserEntity,
    @Param('companyId') companyId: string,
  ) {
    return this.registerService.getStep1(user, companyId);
  }

  @Post('step2/:companyId')
  @ApiOperation({
    summary: 'Complete registration step 2',
    description:
      'Submit company structure and financial information for the second registration step',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID of the company to submit step 2 data for',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: Step2Dto })
  @ApiResponse({
    status: 201,
    description: 'Step 2 completed successfully',
    type: Step2Dto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or step 1 not completed',
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async step2(@Param('companyId') companyId: string, @Body() body: Step2Dto) {
    return this.registerService.registerStep2(companyId, body);
  }

  @Get('step2/:companyId')
  @ApiOperation({
    summary: 'Get step 2 data',
    description: 'Retrieve the submitted data for registration step 2',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID of the company to retrieve step 2 data for',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Step 2 data retrieved successfully',
    type: Step2Dto,
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async getStep2(
    @User() user: UserEntity,
    @Param('companyId') companyId: string,
  ) {
    return this.registerService.getStep2(user, companyId);
  }

  @Post('step3/:companyId')
  @ApiOperation({
    summary: 'Complete registration step 3',
    description:
      'Submit final company details and complete the registration process',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID of the company to submit step 3 data for',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: Step3Dto })
  @ApiResponse({
    status: 201,
    description: 'Step 3 completed successfully',
    type: Step3Dto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or previous steps not completed',
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  async step3(@Param('companyId') companyId: string, @Body() body: Step3Dto) {
    return this.registerService.registerStep3(companyId, body);
  }

  @Get('step3/:companyId')
  @ApiOperation({
    summary: 'Get step 3 data',
    description: 'Retrieve the submitted data for registration step 3',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID of the company to retrieve step 3 data for',
    example: 'c123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Step 3 data retrieved successfully',
    type: Step3Dto,
  })
  @ApiNotFoundResponse({ description: 'Company not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async getStep3(
    @User() user: UserEntity,
    @Param('companyId') companyId: string,
  ) {
    return this.registerService.getStep3(user, companyId);
  }
}
