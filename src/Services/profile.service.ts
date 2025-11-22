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

        let newPhotos: string[] = [];

        if (Array.isArray(updateProfileDto.photos)) {
            newPhotos = updateProfileDto.photos
                .map((p: any) => {
                    if (typeof p === 'string') return p.trim();
                    if (p && typeof p === 'object' && typeof p.url === 'string') return p.url.trim();
                    return null;
                })
                .filter((v): v is string => !!v);

            if (updateProfileDto.profilePicture) {
                const mainUrl = updateProfileDto.profilePicture.trim();

                const allPhotos = [
                    mainUrl,
                    ...(profile.photos || []).filter(p => p !== mainUrl),
                    ...newPhotos.filter(p => p !== mainUrl)
                ];

                updateData.photos = Array.from(new Set(allPhotos));
            } else if (newPhotos.length > 0) {
                updateData.photos = Array.from(new Set(newPhotos));
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

    async getAllProfiles(filters ?: { mode?: string; gender?: string }) {
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
