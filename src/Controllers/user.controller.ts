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
    async requestOtp(@Body() dto: CreateUserDto) {
        return this.userService.requestOtp(dto.email, dto.password);
    }

    @Post('verify-otp')
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getProfile(@Request() req) {
        return this.userService.getUserProfile(req.user.userId);
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
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
