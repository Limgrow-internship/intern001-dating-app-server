import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Preference, PreferenceDocument } from '../Models/preference.model';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectModel(Preference.name)
    private preferenceModel: Model<PreferenceDocument>,
  ) {}

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<PreferenceDocument> {
    const preferences = await this.preferenceModel.findOne({ userId });

    if (!preferences) {
      // Return default preferences if not found
      return this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updateData: Partial<Preference>,
  ): Promise<PreferenceDocument> {
    // Validate age range
    if (updateData.ageMin && updateData.ageMax) {
      if (updateData.ageMin > updateData.ageMax) {
        throw new Error('ageMin cannot be greater than ageMax');
      }
    }

    const preferences = await this.preferenceModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true },
    );

    return preferences;
  }

  /**
   * Create default preferences for a new user
   */
  async createDefaultPreferences(
    userId: string,
  ): Promise<PreferenceDocument> {
    const preferences = await this.preferenceModel.create({
      userId,
      ageMin: 18,
      ageMax: 99,
      genderPreference: ['all'],
      maxDistance: 50,
      mode: 'dating',
      interests: [],
    });

    return preferences;
  }

  /**
   * Delete user preferences
   */
  async deletePreferences(userId: string): Promise<void> {
    await this.preferenceModel.deleteOne({ userId });
  }
}
