import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { UpdateProfileDto } from '../DTO/update-profile.dto';

@Injectable()
export class ProfileService {
    constructor(
        @InjectModel(Profile.name)
        private profileModel: Model<ProfileDocument>,
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

        const updatedProfile = await this.profileModel.findOneAndUpdate(
            { userId },
            { $set: updateData },
            { new: true }
        );

        return updatedProfile;
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
