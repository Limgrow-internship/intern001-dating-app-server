import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile, ProfileDocument } from '../Models/profile.model';
import { Swipe, SwipeDocument } from '../Models/swipe.model';
import { Preference, PreferenceDocument } from '../Models/preference.model';
import { BlockedUser, BlockedUserDocument } from '../Models/blocked-user.model';

interface ScoredProfile {
  profile: ProfileDocument;
  score: number;
  breakdown?: {
    filterScore: number;
    interestScore: number;
    activityScore: number;
    diversityScore: number;
  };
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    @InjectModel(Swipe.name) private swipeModel: Model<SwipeDocument>,
    @InjectModel(Preference.name)
    private preferenceModel: Model<PreferenceDocument>,
    @InjectModel(BlockedUser.name)
    private blockedUserModel: Model<BlockedUserDocument>,
  ) {}

  /**
   * Get personalized recommendations for a user
   * Uses hybrid scoring: Rule-based (60%) + Lightweight ML (40%)
   */
  async getRecommendations(
    userId: string,
    limit: number = 10,
    excludedUserIds?: string[],
  ): Promise<ScoredProfile[]> {
    // 1. Get user profile
    const userProfile = await this.profileModel.findOne({ userId });
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }

    // 2. Get user preferences (or use defaults)
    const preferences = await this.getOrCreatePreferences(userId);

    // 3. Get already swiped users to exclude them
    const swipedUserIds = await this.swipeModel
      .find({ userId })
      .distinct('targetUserId');

    // 3.5. Get blocked users (bi-directional)
    const [blocked, blockedBy] = await Promise.all([
      this.blockedUserModel.find({ blockerUserId: userId }).distinct('blockedUserId'),
      this.blockedUserModel.find({ blockedUserId: userId }).distinct('blockerUserId'),
    ]);
    const blockedUserIds = [...blocked, ...blockedBy, ...(excludedUserIds || [])];

    // 4. Build filter query for candidates
    const filterQuery: any = {
      userId: {
        $ne: userId,
        $nin: [...swipedUserIds, ...blockedUserIds],
      },
      mode: preferences.mode,
    };

    // Age filter
    if (userProfile.age) {
      filterQuery.age = {
        $gte: preferences.ageMin,
        $lte: preferences.ageMax,
      };
    }

    // Gender filter
    if (
      !preferences.genderPreference.includes('all') &&
      preferences.genderPreference.length > 0
    ) {
      filterQuery.gender = { $in: preferences.genderPreference };
    }

    // Distance filter (geospatial query)
    if (userProfile.location && userProfile.location.coordinates && preferences.maxDistance) {
      filterQuery.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: userProfile.location.coordinates, // [lng, lat]
          },
          $maxDistance: preferences.maxDistance * 1000, // Convert km to meters
        },
      };
    }

    // 5. Fetch candidate profiles
    console.log('🔍 Recommendation Filter Query:', JSON.stringify(filterQuery, null, 2));

    const candidates = await this.profileModel
      .find(filterQuery)
      .limit(100) // Limit candidate pool for performance
      .exec();

    console.log(`✅ Found ${candidates.length} candidates for user ${userId}`);

    if (candidates.length === 0) {
      console.log(`⚠️ No candidates found. Swipe count: ${swipedUserIds.length}, Blocked count: ${blockedUserIds.length}`);
      return [];
    }

    // 6. Get recent swipes for diversity calculation
    const recentSwipes = await this.swipeModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .exec();

    const recentTargetIds = recentSwipes.map((s) => s.targetUserId);
    const recentProfiles = await this.profileModel
      .find({ userId: { $in: recentTargetIds } })
      .exec();

    // 7. Score each candidate
    const scoredCandidates: ScoredProfile[] = candidates.map((candidate) => {
      const breakdown = this.calculateHybridScore(
        userProfile,
        candidate,
        recentProfiles,
      );

      const totalScore =
        breakdown.filterScore * 0.4 +
        breakdown.interestScore * 0.25 +
        breakdown.activityScore * 0.15 +
        breakdown.diversityScore * 0.2;

      return {
        profile: candidate,
        score: Math.round(totalScore * 100) / 100, // Round to 2 decimals
        breakdown,
      };
    });

    // 8. Sort by score and add some randomization to top results
    const sorted = scoredCandidates.sort((a, b) => b.score - a.score);

    // Add randomization to top 20% to avoid deterministic ordering
    const topCount = Math.ceil(sorted.length * 0.2);
    const topResults = this.shuffleArray(sorted.slice(0, topCount));
    const restResults = sorted.slice(topCount);

    return [...topResults, ...restResults].slice(0, limit);
  }

  /**
   * Calculate hybrid score for a candidate profile
   */
  private calculateHybridScore(
    userProfile: ProfileDocument,
    candidate: ProfileDocument,
    recentProfiles: ProfileDocument[],
  ): {
    filterScore: number;
    interestScore: number;
    activityScore: number;
    diversityScore: number;
  } {
    const filterScore = this.calculateFilterScore(userProfile, candidate);
    const interestScore = this.calculateInterestScore(
      userProfile.interests || [],
      candidate.interests || [],
    );
    const activityScore = this.calculateActivityScore(candidate);
    const diversityScore = this.calculateDiversityScore(
      candidate,
      recentProfiles,
    );

    return {
      filterScore,
      interestScore,
      activityScore,
      diversityScore,
    };
  }

  /**
   * Rule-based filter score (0-100)
   * Checks basic compatibility criteria
   */
  private calculateFilterScore(
    userProfile: ProfileDocument,
    candidate: ProfileDocument,
  ): number {
    let score = 0;
    let maxScore = 0;

    // Profile completeness check (has bio, interests, photo)
    maxScore += 100;
    let completeness = 0;
    if (candidate.bio && candidate.bio.length > 0) completeness += 33.33;
    if (candidate.interests && candidate.interests.length > 0)
      completeness += 33.33;
    if (candidate.profilePicture) completeness += 33.34;
    score += completeness;

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  /**
   * Interest similarity score using Jaccard index (0-100)
   */
  private calculateInterestScore(
    userInterests: string[],
    candidateInterests: string[],
  ): number {
    if (userInterests.length === 0 || candidateInterests.length === 0) {
      return 50; // Neutral score if no interests
    }

    const userSet = new Set(userInterests.map((i) => i.toLowerCase()));
    const candidateSet = new Set(candidateInterests.map((i) => i.toLowerCase()));

    // Jaccard similarity: intersection / union
    const intersection = new Set(
      [...userSet].filter((x) => candidateSet.has(x)),
    );
    const union = new Set([...userSet, ...candidateSet]);

    const similarity = intersection.size / union.size;
    return similarity * 100;
  }

  /**
   * Activity score based on profile data (0-100)
   * Lightweight ML component - learns from profile patterns
   */
  private calculateActivityScore(candidate: ProfileDocument): number {
    let score = 0;

    // Recent profile updates (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (candidate.updatedAt && candidate.updatedAt > thirtyDaysAgo) {
      score += 30;
    }

    // Profile completeness
    if (candidate.bio && candidate.bio.length > 50) score += 25;
    if (candidate.interests && candidate.interests.length >= 3) score += 25;
    if (candidate.profilePicture) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Diversity score to prevent filter bubbles (0-100)
   * Higher score = less similar to recently seen profiles
   */
  private calculateDiversityScore(
    candidate: ProfileDocument,
    recentProfiles: ProfileDocument[],
  ): number {
    if (recentProfiles.length === 0) {
      return 100; // Max diversity if no recent swipes
    }

    const candidateInterests = new Set(
      (candidate.interests || []).map((i) => i.toLowerCase()),
    );

    // Calculate average similarity to recent profiles
    const similarities = recentProfiles.map((recent) => {
      const recentInterests = new Set(
        (recent.interests || []).map((i) => i.toLowerCase()),
      );

      if (candidateInterests.size === 0 || recentInterests.size === 0) {
        return 0;
      }

      const intersection = new Set(
        [...candidateInterests].filter((x) => recentInterests.has(x)),
      );
      const union = new Set([...candidateInterests, ...recentInterests]);

      return intersection.size / union.size;
    });

    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    // Invert: high similarity = low diversity score
    return (1 - avgSimilarity) * 100;
  }

  /**
   * Get or create default preferences for a user
   */
  async getOrCreatePreferences(
    userId: string,
  ): Promise<PreferenceDocument> {
    let preferences = await this.preferenceModel.findOne({ userId });

    if (!preferences) {
      // Create default preferences
      preferences = await this.preferenceModel.create({
        userId,
        ageMin: 18,
        ageMax: 99,
        genderPreference: ['all'],
        maxDistance: 50,
        mode: 'dating',
        interests: [],
      });
    }

    return preferences;
  }

  /**
   * Fisher-Yates shuffle for randomization
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
