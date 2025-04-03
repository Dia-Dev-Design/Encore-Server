import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiTags, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { PaginationParams } from 'src/types/pagination';
import { StaffJwtAuthGuard } from 'src/auth/staff-auth.guard';
import { StaffAuth } from 'src/auth/decorators/staff-auth.decorator';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerUser(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('by-company/:companyId')
  @Public()
  async getByCompany(@Param('companyId') companyId: string) {
    return await this.userService.getListByCompany(companyId);
  }

  @Get('admin/non-activated')
  @UseGuards(StaffJwtAuthGuard)
  @ApiBearerAuth()
  @StaffAuth()
  @ApiQuery({ type: PaginationParams })
  @ApiResponse({
    status: 200,
    description: 'List of non-activated users retrieved successfully',
  })
  async getNonActivatedUsers(@Query() paginationParams: PaginationParams) {
    const { page = 1, limit = 10 } = paginationParams;
    return this.userService.findNonActivatedUsers(page, limit);
  }

  @Patch('admin/activate/:id')
  @UseGuards(StaffJwtAuthGuard)
  @ApiBearerAuth()
  @StaffAuth()
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
  })
  async activateUser(@Param('id') id: string) {
    return this.userService.activateUser(id);
  }
}
