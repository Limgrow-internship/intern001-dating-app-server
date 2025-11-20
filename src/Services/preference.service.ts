import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Preference, PreferenceDocument } from '../Models/preference.model';
import {
  RecommendationCriteriaResponseDto,
  RecommendationCriteriaRequestDto,
  RangeResponseDto,
} from '../DTO/recommendation-criteria.dto';

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

  // ===== Android-compatible endpoints =====

  /**
   * Get recommendation criteria in Android-compatible format
   */
  async getCriteriaForAndroid(
    userId: string,
  ): Promise<RecommendationCriteriaResponseDto> {
    const preferences = await this.getPreferences(userId);

    return {
      id: preferences._id?.toString() || null,
      seekingGender: preferences.genderPreference || null,
      ageRange: {
        min: preferences.ageMin || 18,
        max: preferences.ageMax || 99,
      },
      distanceRange: {
        min: 1,
        max: preferences.maxDistance || 50,
      },
      interests: preferences.interests || null,
      relationshipModes: preferences.mode ? [preferences.mode] : null,
      heightRange: null, // Not yet supported in Preference model
    };
  }

  /**
   * Update recommendation criteria from Android request
   */
  async updateCriteriaForAndroid(
    userId: string,
    criteriaDto: RecommendationCriteriaRequestDto,
  ): Promise<RecommendationCriteriaResponseDto> {
    // Map Android DTO to Preference model format
    const updateData: Partial<Preference> = {};

    if (criteriaDto.seekingGender !== undefined) {
      updateData.genderPreference = criteriaDto.seekingGender;
    }

    if (criteriaDto.minAge !== undefined) {
      updateData.ageMin = criteriaDto.minAge;
    }

    if (criteriaDto.maxAge !== undefined) {
      updateData.ageMax = criteriaDto.maxAge;
    }

    if (criteriaDto.maxDistance !== undefined) {
      updateData.maxDistance = criteriaDto.maxDistance;
    }

    if (criteriaDto.interests !== undefined) {
      updateData.interests = criteriaDto.interests;
    }

    if (criteriaDto.relationshipModes !== undefined && criteriaDto.relationshipModes.length > 0) {
      // Take first mode (Android sends array, backend uses single mode)
      updateData.mode = criteriaDto.relationshipModes[0];
    }

    // Note: heightRange is ignored as it's not in current Preference model
    // Can be added later if needed

    // Update preferences
    const updated = await this.updatePreferences(userId, updateData);

    // Return in Android format
    return this.getCriteriaForAndroid(userId);
  }
}
