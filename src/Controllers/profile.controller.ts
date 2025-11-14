import { Body, Controller, Get, Put, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ProfileService } from '../Services/profile.service';
import { UpdateProfileDto } from '../DTO/update-profile.dto';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '6️⃣ Get Profile (from Profile collection)',
        description: '🔒 Requires JWT token. Get profile from separate Profile collection.'
    })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async getProfile(@Request() req) {
        return this.profileService.getProfile(req.user.userId);
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '7️⃣ Update Profile (in Profile collection)',
        description: '🔒 Requires JWT token. Update profile in separate Profile collection. This is the main UPDATE PROFILE endpoint!'
    })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
        schema: {
            example: {
                _id: '507f1f77bcf86cd799439011',
                userId: 'user-uuid-here',
                firstName: 'John',
                lastName: 'Doe',
                age: 25,
                gender: 'male',
                bio: 'I love coding',
                interests: ['coding', 'music', 'travel'],
                location: 'Ho Chi Minh City',
                mode: 'dating',
                createdAt: '2025-11-13T...',
                updatedAt: '2025-11-13T...'
            }
        }
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.userId, updateProfileDto);
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Delete Profile',
        description: '🔒 Requires JWT token. Delete profile from Profile collection.'
    })
    @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async deleteProfile(@Request() req) {
        return this.profileService.deleteProfile(req.user.userId);
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all profiles with optional filters' })
    @ApiQuery({ name: 'mode', required: false, enum: ['dating', 'friend'] })
    @ApiQuery({ name: 'gender', required: false, enum: ['male', 'female', 'other'] })
    @ApiResponse({ status: 200, description: 'Profiles retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getAllProfiles(@Query('mode') mode?: string, @Query('gender') gender?: string) {
        return this.profileService.getAllProfiles({ mode, gender });
    }
}
