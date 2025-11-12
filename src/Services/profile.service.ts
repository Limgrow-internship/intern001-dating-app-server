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
        const profile = await this.profileModel.findOne({ userId });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        const updatedProfile = await this.profileModel.findOneAndUpdate(
            { userId },
            { $set: updateProfileDto },
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
