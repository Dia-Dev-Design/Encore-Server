import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { StaffAuth } from 'src/auth/decorators/staff-auth.decorator';
import { CompanyFilterParamsDto } from 'src/companies/dto/company-filter-params';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCompaniesDto } from './dto/get-companies.dto';
import { BasicCompanyInfoDto } from './dto/get-company-info.dto';
import { SubsidiaryDto } from './dto/get-subsidiaries.dto';
import {
  ChangeCompanyClientTypeDto,
  ReassignCompaniesDto,
} from './dto/edit-companies.dto';
import { Public } from '../auth/decorators/public.decorator';
import { StateIsoCode } from 'src/registration/dto/step1.dto';
import { GetMeetingsDto } from './dto/get-meetings.dto';
import { CompanyMeetingParamsDto } from './dto/company-meeting-params';
import { StaffJwtAuthGuard } from 'src/auth/staff-auth.guard';
import { CompanyServicesEnum, GetAllTabEnum } from './enums/comapanies.enum';
import { ActivateDeactivateServiceDto } from './dto/activate-deactivate-service.dto';

import { CompanyIntakeCallDto } from './dto/company-intake-call.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':id')
  @StaffAuth()
  @UseGuards(StaffJwtAuthGuard)
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'Retrieves detailed information about a specific company.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the company',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Company details retrieved successfully',
    type: BasicCompanyInfoDto,
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  getCompanyById(@Param('id') id: string) {
    return this.companiesService.getCompanyById(id);
  }

  @Get()
  //@StaffAuth()
  @Public()
  @ApiOperation({
    summary: 'Get all companies',
    description:
      'Retrieves a paginated list of companies with optional filtering.',
  })
  @ApiQuery({
    type: CompanyFilterParamsDto,
    description: 'Filter and pagination parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of companies with pagination metadata',
    type: GetCompaniesDto,
    isArray: true,
  })
  getCompanies(@Query() query: CompanyFilterParamsDto) {
    return this.companiesService.getCompanies(query);
  }

  @Post('assign')
  //@UseGuards(StaffJwtAuthGuard)
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Companies reassigned successfully',
  })
  reassignCompanies(@Body() payload: ReassignCompaniesDto) {
    return this.companiesService.reassignCompanies(payload);
  }

  @Post('change-type')
  //@UseGuards(StaffJwtAuthGuard)
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Companies successfully changed',
  })
  changeCompaniesTypes(@Body() payload: ChangeCompanyClientTypeDto) {
    return this.companiesService.changeCompaniesTypes(payload);
  }

  @Get(':id/info')
  @StaffAuth()
  @ApiOperation({
    summary: 'Get company information',
    description: 'Retrieves basic information about a specific company.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the company',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Company information retrieved successfully',
    type: BasicCompanyInfoDto,
  })
  getCompanyInfo(@Param('id') id: string): Promise<BasicCompanyInfoDto> {
    return this.companiesService.getCompanyInfo(id);
  }

  @Get(':id/subsidiaries')
  @StaffAuth()
  @ApiOperation({
    summary: 'Get company subsidiaries',
    description: 'Retrieves a list of subsidiaries for a specific company.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the parent company',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Company subsidiaries retrieved successfully',
    type: SubsidiaryDto,
    isArray: true,
  })
  getSubsidiaries(@Param('id') id: string): Promise<SubsidiaryDto[]> {
    return this.companiesService.getSubsidiaries(id);
  }

  @Get(':id/meetings')
  @StaffAuth()
  @ApiOperation({
    summary: 'Get company meetings',
    description:
      'Retrieves a list of meetings associated with a specific company.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique identifier of the company',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    type: CompanyMeetingParamsDto,
    description: 'Meeting filter parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'Company meetings retrieved successfully',
    type: GetMeetingsDto,
  })
  getMeetings(
    @Param('id') id: string,
    @Query() query: CompanyMeetingParamsDto,
  ): Promise<GetMeetingsDto> {
    return this.companiesService.getMeetings(id, query);
  }

  @Post(':id/services/activate-deactivate')
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description: 'Service successfully activated or deactivated',
    schema: {
      example: {
        service: {
          name: CompanyServicesEnum.AI_CHATBOT,
          enabled: true,
        },
      },
    },
  })
  async activateDeactivateService(
    @Param('id') id: string,
    @Body() payload: ActivateDeactivateServiceDto,
  ) {
    const updatedService =
      await this.companiesService.activateDeactivateService(id, payload);
    return updatedService;
  }

  @Post('intake-call/:id')
  @Public()
  @ApiBody({ type: CompanyIntakeCallDto })
  async updateIntakeCall(
    @Body() payload: CompanyIntakeCallDto,
    @Param('id') id: string,
  ) {
    return await this.companiesService.updateIntakeCallForm(payload, id);
  }

  @Get('intake-call/:id')
  @Public()
  async getIntakeCall(@Param('id') id: string) {
    return await this.companiesService.getIntakeCallformInfo(id);
  }
}
