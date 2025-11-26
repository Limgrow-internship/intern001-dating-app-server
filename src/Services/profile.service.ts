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

        // Auto-create profile if not exists (for users who signed up before profile feature)
        if (!profile) {
            console.log(`Profile not found for userId: ${userId}, creating new profile...`);
            profile = new this.profileModel({
                userId,
                interests: [],
                mode: 'dating',
            });
            await profile.save();
            console.log(`New profile created for userId: ${userId}`);
        }

        // Prepare update data
        const updateData: any = { ...updateProfileDto };

        // Handle location field - convert to GeoJSON format if provided
        if (updateProfileDto.location) {
            if (typeof updateProfileDto.location === 'object' && 'longitude' in updateProfileDto.location && 'latitude' in updateProfileDto.location) {
                // Convert { longitude, latitude } to GeoJSON format
                updateData.location = {
                    type: 'Point',
                    coordinates: [updateProfileDto.location.longitude, updateProfileDto.location.latitude]
                };
            } else {
                // If it's a string or invalid format, remove it from update to prevent geo index errors
                delete updateData.location;
            }
        }

        // Handle profilePicture - upload to Photo collection if provided
        if (updateProfileDto.profilePicture) {
            try {
                await this.photoService.uploadFromUrl(
                    userId,
                    updateProfileDto.profilePicture,
                    PhotoSource.UPLOAD,
                    PhotoType.AVATAR,
                );
                // Set as primary photo
                const photos = await this.photoService.getUserPhotos(userId);
                if (photos.length > 0) {
                    const latestPhoto = photos[photos.length - 1];
                    await this.photoService.setPrimaryPhoto(userId, (latestPhoto._id as any).toString());
                }
                console.log(`Uploaded profilePicture to Photo collection for userId: ${userId}`);
            } catch (error) {
                console.error(`Failed to upload profilePicture for userId: ${userId}:`, error);
            }
            // Remove profilePicture from updateData as it's now handled by Photo service
            delete updateData.profilePicture;
        }

        // Handle zodiac field - map zodiac to zodiacSign (Profile model uses zodiacSign)
        if (updateProfileDto.zodiac) {
            updateData.zodiacSign = updateProfileDto.zodiac;
            delete updateData.zodiac;
        }
        // If zodiacSign is provided directly, use it (app sends zodiacSign)
        if (updateProfileDto.zodiacSign) {
            updateData.zodiacSign = updateProfileDto.zodiacSign;
            delete updateData.zodiac; // Remove zodiac if exists to avoid conflict
        }

        const updatedProfile = await this.profileModel.findOneAndUpdate(
            { userId },
            { $set: updateData },
            { new: true }
        );

        return updatedProfile;
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
}
