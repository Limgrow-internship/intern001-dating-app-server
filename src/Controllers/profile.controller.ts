import { Body, Controller, Get, Put, Delete, UseGuards, Request, Query, Param } from '@nestjs/common';
import { ProfileService } from '../Services/profile.service';
import { UpdateProfileDto } from '../DTO/update-profile.dto';
import { JwtAuthGuard } from '../Guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MatchCardResponseDto } from '../DTO/match-card-response.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '6️⃣ Get Profile with Photos (NEW)',
        description: 'Requires JWT token. Get profile with photos from Photos collection. Returns avatar and photos array with metadata.'
    })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully with photos' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async getProfile(@Request() req) {
        return this.profileService.getProfileWithPhotos(req.user.userId);
    }

    @Put()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: '7️⃣ Update Profile (in Profile collection)',
        description: 'Requires JWT token. Update profile in separate Profile collection. This is the main UPDATE PROFILE endpoint!'
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
        try {
            const result = await this.profileService.updateProfile(req.user.userId, updateProfileDto);
            return result;
        } catch (error) {
            throw error;
        }
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Delete Profile and All Related Data',
        description: 'Requires JWT token. Permanently delete profile and all related data including: photos, swipes, matches, conversations, blocked users, daily limits, and preferences. This action cannot be undone!'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Profile and all related data deleted successfully',
        schema: {
            example: {
                message: 'Profile and all related data deleted successfully',
                deleted: {
                    profile: true,
                    photos: true,
                    swipes: true,
                    matches: true,
                    conversations: true,
                    blockedUsers: true,
                    dailyLimits: true,
                    preferences: true,
                }
            }
        }
    })
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

    @Get(':userId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get Profile by User ID',
        description: 'Requires JWT token. Get profile of another user by userId. Returns profile in MatchCardResponse format with photos and distance calculation. Used for displaying profile card when user clicks on like notification.'
    })
    @ApiParam({ 
        name: 'userId', 
        description: 'User ID of the profile to retrieve',
        example: 'user-uuid-here'
    })
    @ApiQuery({
        name: 'latitude',
        required: false,
        type: Number,
        description: 'User current latitude from GPS',
    })
    @ApiQuery({
        name: 'longitude',
        required: false,
        type: Number,
        description: 'User current longitude from GPS',
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Profile retrieved successfully',
        type: MatchCardResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    @ApiResponse({ status: 400, description: 'Cannot view profile - user is blocked' })
    async getProfileById(
        @Param('userId') userId: string, 
        @Request() req,
        @Query('latitude') latitude?: string,
        @Query('longitude') longitude?: string,
    ): Promise<MatchCardResponseDto> {
        // Parse location from query params if provided
        let userLocation: { coordinates: number[] } | undefined;
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                // GeoJSON format: [longitude, latitude]
                userLocation = { coordinates: [lng, lat] };
            }
        }

        return this.profileService.getProfileById(userId, req.user.userId, userLocation);
    }
}
