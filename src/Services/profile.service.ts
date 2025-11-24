import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { UpdateProfileDto } from '../DTO/update-profile.dto';
import { PhotoService } from './photo.service';
import { PhotoSource, PhotoType } from '../Models/photo.model';

@Injectable()
export class ProfileService {
    constructor(
        @InjectModel(Profile.name)
        private profileModel: Model<ProfileDocument>,
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

        if (!profile) {
            profile = new this.profileModel({
                userId,
                interests: [],
                mode: 'dating',
                photos: []
            });
            await profile.save();
        }

        const updateData: any = { ...updateProfileDto };
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
    }

    async deleteProfile(userId: string) {
        const result = await this.profileModel.deleteOne({ userId });

        if (result.deletedCount === 0) {
            throw new NotFoundException('Profile not found');
        }

        return { message: 'Profile deleted successfully' };
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
