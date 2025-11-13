import { Body, Controller, Post, Get, Put, UseGuards, Request, Delete, Req } from '@nestjs/common';
import { UserService } from '../Services/user.service';
import { CreateUserDto } from '../DTO/create-user.dto';
import { VerifyOtpDto } from '../DTO/verify-otp.dto';
import { ChangePasswordDto } from '../DTO/change-password.dto';
import { UpdateProfileDto } from '../DTO/update-profile.dto';
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

    @Put('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'Change password successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    changePassword(@Request() req, @Body() body: ChangePasswordDto) {

        return this.userService.changePassword(
            req.user.userId,
            body.newPassword,
            body.confirmPassword,
            body.deviceInfo
        );
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '4️⃣ Get User Profile (from User table)',
        description: '🔒 Requires JWT token. Click "Authorize" button and paste token from login.'
    })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getProfile(@Request() req) {
        return this.userService.getUserProfile(req.user.userId);
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '5️⃣ Update User Profile (in User table)',
        description: '🔒 Requires JWT token. Update user profile information in User collection.'
    })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
        return this.userService.updateUserProfile(req.user.userId, updateProfileDto);
    }
    @UseGuards(JwtAuthGuard)
    @Delete('/account')
    async deleteAccount(@Req() req) {
        const userId = req.user.userId;
    await this.userService.deleteAccount(userId);
    return { message: "Your account has been deleted successfully!" };
}
}
