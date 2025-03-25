import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { Auth } from './entities/auth.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { JwtAuthGuard } from './auth.guard';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
// import { GoogleGuard } from './google.guard';
import { Public } from './decorators/public.decorator';
import { User } from './decorators/user.decorator';
import { UserEntity } from 'src/user/entities/user.entity';

import { StaffJwtPayload, UserJwtPayload } from './types/jwt-payload.types';
import { StaffJwtAuthGuard } from './staff-auth.guard';
import { StaffUserService } from 'src/user/services/staff-service-user.service';
import { StaffAuth } from './decorators/staff-auth.decorator';
import { Request, Response } from 'express';
import { UserService } from '../user/services/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly staffUserService: StaffUserService,
  ) {
    console.log('AuthService intialized');
  }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate a user and return a JWT access token',
  })
  @ApiCreatedResponse({
    type: Auth,
    description:
      'Successfully authenticated. Returns JWT access token and user information',
  })
  @ApiNotFoundResponse({ description: 'User account not found in the system' })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password combination',
  })
  login(@Body() body: LoginDto) {
    console.log('We hav hit login this body+++>', body);
    return this.authService.login(body);
  }

  @Post('signup')
  @Public()
  @ApiOperation({
    summary: 'User registration',
    description: 'Create a new user account and return authentication token',
  })
  @ApiCreatedResponse({
    type: Auth,
    description:
      'Account created successfully. Returns JWT access token and user information',
  })
  @ApiBadRequestResponse({
    description: 'Email already registered or invalid input data provided',
  })
  signup(@Body() body: CreateUserDto) {
    return this.authService.signUp(body);
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh token',
    description:
      'Generate a new JWT access token using the current valid token',
  })
  @ApiCreatedResponse({
    type: Auth,
    description: 'New JWT access token generated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Current token is invalid or expired',
  })
  refresh(@User() user: UserEntity) {
    return this.authService.refresh(user);
  }

  @Post('request-password-reset')
  @Public()
  @ApiOperation({
    summary: 'Request password reset',
    description: "Send a password reset link to the user's email address",
  })
  @ApiCreatedResponse({
    description: 'Password reset instructions sent to email',
  })
  @ApiNotFoundResponse({
    description: 'No account found with the provided email address',
  })
  restorePassword(@Body() body: RequestResetPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Post('reset-password-default')
  @ApiOperation({
    summary: 'Reset password to default',
    description: "Reset a user's password to the system default value",
  })
  @ApiQuery({
    name: 'userId',
    description: 'ID of the user whose password needs to be reset',
    required: true,
  })
  @ApiCreatedResponse({
    description: 'Password reset to default successfully',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async resetPasswordDefault(@Query('userId') userId: string) {
    return await this.authService.resetPasswordDefault(userId);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using a valid reset token',
  })
  @ApiCreatedResponse({
    description: 'Password changed successfully',
  })
  @ApiNotFoundResponse({
    description: 'Invalid or expired reset token',
  })
  resetPassword(@Body() body: ResetPasswordDto) {
    const decodedToken = decodeURIComponent(body.token);
    return this.authService.resetPassword(decodedToken, body.newPassword);
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({
    summary: 'Verify email',
    description: "Verify user's email address using the verification token",
  })
  @ApiQuery({
    name: 'token',
    description: "Email verification token sent to user's email",
    required: true,
  })
  @ApiOkResponse({ description: 'Email verified successfully' })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired verification token',
  })
  verifyEmail(@Query('token') token: string) {
    const decodedToken = decodeURIComponent(token);
    return this.authService.verifyEmail(decodedToken);
  }

  @Post('admin/login')
  @ApiOperation({
    summary: 'Staff login',
    description: 'Login for staff members',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Staff login successful' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async staffLogin(@Body() loginDto: LoginDto) {
    console.log('✅ staffLogin method reached with payload:', loginDto);
    try {
      const result = await this.authService.staffLogin(loginDto);
      console.log('✅ Staff login successful');
      return result;
    } catch (error) {
      console.error('❌ Staff login error:', error);
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user info',
    description: "Retrieve authenticated user's information",
  })
  @ApiOkResponse({ description: 'User information retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getUserInfo(
    @User() user: UserJwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return await this.userService.getUser(user);
  }

  @Get('admin/me')
  @UseGuards(StaffJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get staff info',
    description: "Retrieve authenticated staff member's information",
  })
  @ApiOkResponse({ description: 'Staff information retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired staff token' })
  getStaffUserInfo(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Disable caching for this endpoint
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    console.log('Admin/me endpoint reached with user:', req.user);
    return this.staffUserService.findById((req.user as StaffJwtPayload).id);
  }
}
