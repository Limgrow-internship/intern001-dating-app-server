import { ProfileDocument } from '../Models/profile.model';
import { MatchDocument } from '../Models/match.model';
import {
  MatchCardResponseDto,
  PhotoResponseDto,
  LocationResponseDto,
} from '../DTO/match-card-response.dto';
import {
  UserProfileResponseDto,
  MatchResultResponseDto,
} from '../DTO/match-result-response.dto';
import {
  MatchResponseDto,
  MatchStatus,
} from '../DTO/match-list-response.dto';
import { DistanceCalculator } from './distance-calculator';

/**
 * Transform backend data models to Android-compatible DTOs
 */
export class ResponseTransformer {
  /**
   * Transform Profile to MatchCardResponse
   */
  static toMatchCardResponse(
    profile: ProfileDocument,
    userLocation?: { coordinates: number[] },
  ): MatchCardResponseDto {
    const distance = userLocation && profile.location?.coordinates
      ? DistanceCalculator.calculateDistanceFromCoords(
          userLocation.coordinates,
          profile.location.coordinates,
        )
      : null;

    return {
      id: (profile._id as any).toString(),
      userId: profile.userId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null,
      age: profile.age || null,
      gender: profile.gender || null,
      avatar: profile.avatar || profile.photos?.[0] || null,
      photos: this.transformPhotos(profile.photos),
      bio: profile.bio || null,
      distance,
      location: this.transformLocation(profile.location, profile.city, profile.country),
      occupation: profile.occupation || null,
      company: profile.company || null,
      education: profile.education || null,
      interests: profile.interests || null,
      relationshipMode: profile.relationshipMode || profile.mode || null,
      height: profile.height || null,
      zodiacSign: profile.zodiacSign || null,
      isVerified: profile.isVerified || null,
    };
  }

  /**
   * Transform Profile to UserProfileResponse (full profile)
   */
  static toUserProfileResponse(
    profile: ProfileDocument,
  ): UserProfileResponseDto {
    return {
      id: (profile._id as any).toString(),
      userId: profile.userId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      avatar: profile.avatar || profile.photos?.[0] || null,
      bio: profile.bio || null,
      age: profile.age || null,
      gender: profile.gender || null,
      interests: profile.interests || null,
      relationshipMode: profile.relationshipMode || profile.mode || null,
      height: profile.height || null,
      weight: profile.weight || null,
      location: this.transformLocation(profile.location, profile.city, profile.country),
      occupation: profile.occupation || null,
      company: profile.company || null,
      education: profile.education || null,
      zodiacSign: profile.zodiacSign || null,
      photos: this.transformPhotos(profile.photos),
      profileCompleteness: profile.profileCompleteness || null,
      profileViews: profile.profileViews || null,
      createdAt: profile.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: profile.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Transform Match to MatchResponse
   */
  static toMatchResponse(
    match: MatchDocument,
    matchedUserProfile: ProfileDocument,
    currentUserId: string,
  ): MatchResponseDto {
    return {
      id: (match._id as any).toString(),
      userId: currentUserId,
      matchedUserId: match.userId === currentUserId ? match.targetUserId : match.userId,
      matchedUser: this.toUserProfileResponse(matchedUserProfile),
      status: match.status as MatchStatus,
      createdAt: (match as any).createdAt?.toISOString() || new Date().toISOString(),
      matchedAt: match.matchedAt?.toISOString() || null,
    };
  }

  /**
   * Transform array of photo URLs to PhotoResponse[]
   */
  private static transformPhotos(photos?: string[]): PhotoResponseDto[] | null {
    if (!photos || photos.length === 0) {
      return null;
    }

    return photos.map((url, index) => ({
      url,
      order: index,
      uploadedAt: null, // Can add timestamp if available
    }));
  }

  /**
   * Transform location to LocationResponse
   */
  private static transformLocation(
    location?: { type: string; coordinates: number[] },
    city?: string,
    country?: string,
  ): LocationResponseDto | null {
    if (!location || !location.coordinates || location.coordinates.length < 2) {
      return null;
    }

    // GeoJSON format is [longitude, latitude]
    const [longitude, latitude] = location.coordinates;

    return {
      latitude,
      longitude,
      city: city || null,
      country: country || null,
    };
  }

  /**
   * Create MatchResultResponse for successful match
   */
  static toMatchResult(
    isMatch: boolean,
    match: MatchDocument | null,
    matchedUserProfile: ProfileDocument | null,
  ): MatchResultResponseDto {
    return {
      isMatch,
      matchId: match ? (match._id as any).toString() : null,
      matchedUser: matchedUserProfile ? this.toUserProfileResponse(matchedUserProfile) : null,
    };
  }
}
