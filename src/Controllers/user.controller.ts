import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { UserService } from '../Services/user.service';
import { CreateUserDto } from '../DTO/create-user.dto';
import { VerifyOtpDto } from '../DTO/verify-otp.dto';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UsersController {
    constructor(private readonly userService: UserService) { }

    @Post('request-otp')
    @ApiOperation({
        summary: '1️⃣ Step 1: Request OTP for Signup',
        description: 'Register new user and send OTP to email. Use this first!'
    })
    @ApiResponse({ status: 201, description: 'OTP sent successfully to email' })
    @ApiResponse({ status: 400, description: 'User already exists or invalid email' })
    async requestOtp(@Body() dto: CreateUserDto) {
        return this.userService.requestOtp(dto.email, dto.password);
    }

    @Post('verify-otp')
    @ApiOperation({
        summary: '2️⃣ Step 2: Verify OTP to complete Signup',
        description: 'Verify OTP code from email to activate account'
    })
    @ApiResponse({ status: 200, description: 'OTP verified, account activated' })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        return this.userService.verifyOtp(dto.email, dto.otp);
    }

    @Get('info')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '4️⃣ Get User Auth Info (email, status, etc.)',
        description: '🔒 Requires JWT token. Returns authentication-related info only (not profile data). For profile data, use /api/profile endpoint.'
    })
    @ApiResponse({ status: 200, description: 'User auth info retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getProfile(@Request() req) {
        return this.userService.getUserProfile(req.user.userId);
    }
}
