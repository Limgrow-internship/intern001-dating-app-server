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
import { OPEN_QUESTIONS } from "../constant/open-questions.constant";


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
        if (!profile) throw new NotFoundException('Profile not found');

        return {
            ...profile.toObject(),
            openQuestionAnswers: profile.openQuestionAnswers ?? {}
        };
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
        try {
            let profile = await this.profileModel.findOne({ userId });

            if (!profile) {
                profile = new this.profileModel({
                    userId,
                    interests: [],
                    mode: 'dating',
                    photos: [],
                    openQuestionAnswers: new Map(),
                });

                await profile.save();
            }

            const p = profile as ProfileDocument;

            if (!(p.openQuestionAnswers instanceof Map)) {
                p.openQuestionAnswers = new Map(
                    Object.entries((p.openQuestionAnswers as any) || {})
                );
            }

            const updateData: any = { ...updateProfileDto };

            if (updateProfileDto.location) {
                const loc: any = updateProfileDto.location;

                if (
                    typeof loc === "object" &&
                    Array.isArray(loc.coordinates) &&
                    loc.coordinates.length >= 2
                ) {
                    const lng = Number(loc.coordinates[0]);
                    const lat = Number(loc.coordinates[1]);

                    if (!isNaN(lng) && !isNaN(lat)) {
                        updateData.location = {
                            type: "Point",
                            coordinates: [lng, lat],
                        };
                    } else {
                        delete updateData.location;
                    }
                }

                else if (typeof loc === "object" && "longitude" in loc && "latitude" in loc) {
                    const lng = Number(loc.longitude);
                    const lat = Number(loc.latitude);

                    if (!isNaN(lng) && !isNaN(lat)) {
                        updateData.location = {
                            type: "Point",
                            coordinates: [lng, lat],
                        };
                    } else {
                        delete updateData.location;
                    }
                } else {
                    delete updateData.location;
                }
            }

            if (updateProfileDto.profilePicture) {
                try {
                    await this.photoService.uploadFromUrl(
                        userId,
                        updateProfileDto.profilePicture,
                        PhotoSource.UPLOAD,
                        PhotoType.AVATAR
                    );

                    const photos = await this.photoService.getUserPhotos(userId);
                    if (photos.length > 0) {
                        const latest = photos[photos.length - 1];
                        await this.photoService.setPrimaryPhoto(userId, String(latest._id));
                    }
                } catch (_) { }

                delete updateData.profilePicture;
            }

            if (updateProfileDto.relationshipMode) {
                const rm = updateProfileDto.relationshipMode;
                if (rm === "Serious Mode") updateData.relationshipMode = "serious";
                else if (rm === "Casual Mode") updateData.relationshipMode = "casual";
                else if (rm === "Friendship Mode") updateData.relationshipMode = "friendship";
            }

            if (updateData.openQuestionAnswers) {
                const incomingMap: Map<string, string> =
                    updateData.openQuestionAnswers instanceof Map
                        ? updateData.openQuestionAnswers
                        : new Map(Object.entries(updateData.openQuestionAnswers));

                const validMap = new Map<string, string>();

                incomingMap.forEach((value, key) => {
                    if (OPEN_QUESTIONS.what[key] || OPEN_QUESTIONS.ideal[key]) {
                        validMap.set(key, value);
                    }
                });

                p.openQuestionAnswers.clear();
                validMap.forEach((v, k) => p.openQuestionAnswers.set(k, v));

                p.markModified("openQuestionAnswers");

                delete updateData.openQuestionAnswers;
            }

            if (updateData.location) {
                await this.profileModel.collection.updateOne(
                    { userId },
                    { $set: { location: updateData.location } }
                );

                profile = await this.profileModel.findOne({ userId });
                if (!profile) throw new NotFoundException("Profile lost after update");

                delete updateData.location;
            }

            Object.keys(updateData).forEach((key) => {
                if (updateData[key] !== null && updateData[key] !== undefined) {
                    (p as any)[key] = updateData[key];
                }
            });

            await p.save();
            const updated = await this.profileModel.findOne({ userId });

            return updated;
        } catch (err) {
            throw err;
        }
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
            this.photoService.deleteAllUserPhotos(userId).catch(() => undefined),

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
    async getProfileById(
        targetUserId: string,
        currentUserId: string,
        userLocation?: { coordinates: number[] },
    ): Promise<MatchCardResponseDto> {
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

        // Use location from query params if provided, otherwise get from profile
        let locationForDistance = userLocation;
        if (!locationForDistance) {
            const currentUserProfile = await this.profileModel.findOne({ userId: currentUserId });
            locationForDistance = currentUserProfile?.location;
        }

        // Transform to MatchCardResponse format
        return ResponseTransformer.toMatchCardResponse(
            targetProfile,
            locationForDistance,
            photos,
        );
    }
}
