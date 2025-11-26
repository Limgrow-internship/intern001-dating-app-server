import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { UpdateProfileDto } from '../DTO/update-profile.dto';
import { PhotoService } from './photo.service';
import { PhotoSource, PhotoType } from '../Models/photo.model';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { Match, MatchDocument } from '../Models/match.model';
import { Conversation, ConversationDocument } from '../Models/conversation.model';
import { BlockedUser, BlockedUserDocument } from '../Models/blocked-user.model';
import { DailyLimit, DailyLimitDocument } from '../Models/daily-limit.model';
import { Preference, PreferenceDocument } from '../Models/preference.model';
import { ResponseTransformer } from '../Utils/response-transformer';
import { MatchCardResponseDto } from '../DTO/match-card-response.dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectModel(Profile.name)
        private profileModel: Model<ProfileDocument>,
        @InjectModel(Swipe.name)
        private swipeModel: Model<SwipeDocument>,
        @InjectModel(Match.name)
        private matchModel: Model<MatchDocument>,
        @InjectModel(Conversation.name)
        private conversationModel: Model<ConversationDocument>,
        @InjectModel(BlockedUser.name)
        private blockedUserModel: Model<BlockedUserDocument>,
        @InjectModel(DailyLimit.name)
        private dailyLimitModel: Model<DailyLimitDocument>,
        @InjectModel(Preference.name)
        private preferenceModel: Model<PreferenceDocument>,
        private photoService: PhotoService,
    ) { }

    async createProfile(userId: string) {
        const existingProfile = await this.profileModel.findOne({ userId });
        if (existingProfile) {
            throw new BadRequestException('Profile already exists for this user');
        }

        const newProfile = new this.profileModel({
            userId,
            interests: [],
            mode: 'dating',
        });

        return await newProfile.save();
    }

    async getProfile(userId: string) {
        const profile = await this.profileModel.findOne({ userId });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        return profile;
    }

    async getProfileWithPhotos(userId: string) {
        const profile = await this.profileModel.findOne({ userId });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        // Get photos from Photo collection
        const photos = await this.photoService.getUserPhotos(userId);
        const primaryPhoto = await this.photoService.getPrimaryPhoto(userId);

        return {
            ...profile.toObject(),
            openQuestionAnswers: profile.openQuestionAnswers ?? {},
            avatar: primaryPhoto?.url || null,
            photos: photos.map(p => ({
                id: p._id,
                url: p.url,
                type: p.type,
                source: p.source,
                isPrimary: p.isPrimary,
                order: p.order,
                isVerified: p.isVerified,
                width: p.width,
                height: p.height,
                createdAt: p.createdAt,
            })),
        };
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        let profile = await this.profileModel.findOne({ userId });

        if (!profile) {
            profile = new this.profileModel({
                userId,
                interests: [],
                mode: 'dating',
                photos: [],
                openQuestionAnswers: {},
            });
            await profile.save();
        }

        const updateData: any = { ...updateProfileDto };

        // Handle location
        if (updateProfileDto.location) {
            const loc = updateProfileDto.location;
            if (typeof loc === 'object' && 'longitude' in loc && 'latitude' in loc) {
                updateData.location = {
                    type: 'Point',
                    coordinates: [loc.longitude, loc.latitude]
                };
            } else {
                delete updateData.location;
            }
        }

        // Handle profilePicture
        if (updateProfileDto.profilePicture) {
            try {
                await this.photoService.uploadFromUrl(
                    userId,
                    updateProfileDto.profilePicture,
                    PhotoSource.UPLOAD,
                    PhotoType.AVATAR,
                );
                const photos = await this.photoService.getUserPhotos(userId);
                if (photos.length > 0) {
                    const latestPhoto = photos[photos.length - 1];
                    await this.photoService.setPrimaryPhoto(userId, (latestPhoto._id as any).toString());
                }
            } catch (error) {
                console.error(error);
            }
            delete updateData.profilePicture;
        }

        // Map zodiac
        if (updateProfileDto.zodiacSign) updateData.zodiacSign = updateProfileDto.zodiacSign;

        // Map relationshipMode aliases
        if (updateProfileDto.relationshipMode) {
            const rm = updateProfileDto.relationshipMode;
            if (rm === 'Serious Mode') updateData.relationshipMode = 'serious';
            else if (rm === 'Casual Mode') updateData.relationshipMode = 'casual';
            else if (rm === 'Friendship Mode') updateData.relationshipMode = 'friendship';
        }
        if (updateData.openQuestionAnswers) {
            profile.openQuestionAnswers = updateData.openQuestionAnswers as Record<string, string>;
            delete updateData.openQuestionAnswers;
        }



        // Update database
        Object.assign(profile, updateData);
        await profile.save();
        return profile;
    }



    async deleteProfile(userId: string) {
        // Check if profile exists
        const profile = await this.profileModel.findOne({ userId });
        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        // Delete all related data
        const deleteOperations = [
            // Delete profile
            this.profileModel.deleteOne({ userId }),
            
            // Delete all photos
            this.photoService.deleteAllUserPhotos(userId).catch(err => {
                console.error(`Error deleting photos for user ${userId}:`, err);
            }),
            
            // Delete all swipes where user is the swiper or target
            this.swipeModel.deleteMany({
                $or: [
                    { userId },
                    { targetUserId: userId }
                ]
            }),
            
            // Delete all matches where user is involved
            this.matchModel.deleteMany({
                $or: [
                    { userId },
                    { targetUserId: userId }
                ]
            }),
            
            // Delete all conversations where user is involved
            this.conversationModel.deleteMany({
                $or: [
                    { userId1: userId },
                    { userId2: userId }
                ]
            }),
            
            // Delete all blocked user records where user is blocker or blocked
            this.blockedUserModel.deleteMany({
                $or: [
                    { blockerUserId: userId },
                    { blockedUserId: userId }
                ]
            }),
            
            // Delete all daily limits
            this.dailyLimitModel.deleteMany({ userId }),
            
            // Delete preferences
            this.preferenceModel.deleteMany({ userId }),
        ];

        // Execute all delete operations
        await Promise.allSettled(deleteOperations);

        return { 
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
        };
    }

    async getAllProfiles(filters?: { mode?: string; gender?: string }) {
        const query: any = {};

        if (filters?.mode) {
            query.mode = filters.mode;
        }

        if (filters?.gender) {
            query.gender = filters.gender;
        }

        return await this.profileModel.find(query).select('-__v');
    }

    /**
     * Get profile by userId for displaying card (e.g., when user clicks on like notification)
     * Returns profile in MatchCardResponse format
     */
    async getProfileById(targetUserId: string, currentUserId: string): Promise<MatchCardResponseDto> {
        // Check if target user exists
        const targetProfile = await this.profileModel.findOne({ userId: targetUserId });
        if (!targetProfile) {
            throw new NotFoundException('Profile not found');
        }

        // Check if users have blocked each other
        const isBlocked = await this.blockedUserModel.findOne({
            $or: [
                { blockerUserId: currentUserId, blockedUserId: targetUserId },
                { blockerUserId: targetUserId, blockedUserId: currentUserId },
            ],
        });

        if (isBlocked) {
            throw new BadRequestException('Cannot view profile - user is blocked');
        }

        // Get target user's photos
        const photos = await this.photoService.getUserPhotos(targetUserId);

        // Get current user's location for distance calculation
        const currentUserProfile = await this.profileModel.findOne({ userId: currentUserId });
        const userLocation = currentUserProfile?.location;

        // Transform to MatchCardResponse format
        return ResponseTransformer.toMatchCardResponse(
            targetProfile,
            userLocation,
            photos,
        );
    }
}
