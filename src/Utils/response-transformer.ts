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
import { Photo } from '../Models/photo.model';

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
    photos?: Photo[],
  ): MatchCardResponseDto {
    const distance = userLocation && profile.location?.coordinates
      ? DistanceCalculator.calculateDistanceFromCoords(
        userLocation.coordinates,
        profile.location.coordinates,
      )
      : null;

    // Transform photos from Photo collection
    const photoDtos = this.transformPhotosFromCollection(photos);
    const primaryPhoto = photos?.find(p => p.isPrimary);
    const avatar = primaryPhoto?.url || photoDtos?.[0]?.url || null;

    return {
      id: (profile._id as any).toString(),
      userId: profile.userId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null,
      age: profile.age || null,
      gender: profile.gender || null,
      avatar,
      photos: photoDtos,
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
    photos?: Photo[],
  ): UserProfileResponseDto {
    // Transform photos from Photo collection
    const photoDtos = this.transformPhotosFromCollection(photos);
    const primaryPhoto = photos?.find(p => p.isPrimary);
    const avatar = primaryPhoto?.url || photoDtos?.[0]?.url || null;

    return {
      id: (profile._id as any).toString(),
      userId: profile.userId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      displayName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      avatar,
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
      photos: photoDtos,
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
    photos?: Photo[],
  ): MatchResponseDto {
    // Map database status to DTO status
    let status: MatchStatus;
    if (match.status === 'active') {
      status = MatchStatus.MATCHED;
    } else if (match.status === 'unmatched') {
      status = MatchStatus.UNMATCHED;
    } else {
      status = match.status as MatchStatus;
    }

    return {
      id: (match._id as any).toString(),
      userId: currentUserId,
      matchedUserId: match.userId === currentUserId ? match.targetUserId : match.userId,
      matchedUser: this.toUserProfileResponse(matchedUserProfile, photos),
      status,
      createdAt: (match as any).createdAt?.toISOString() || new Date().toISOString(),
      matchedAt: match.matchedAt?.toISOString() || null,
    };
  }

  /**
   * Transform photos from Photo collection to PhotoResponseDto[]
   */
  private static transformPhotosFromCollection(photos?: Photo[]): PhotoResponseDto[] | null {
    if (!photos || photos.length === 0) {
      return null;
    }

    return photos.map((photo) => ({
      url: photo.url,
      order: photo.order,
      uploadedAt: photo.createdAt?.toISOString() || null,
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
    photos?: Photo[],
  ): MatchResultResponseDto {
    return {
      isMatch,
      matchId: match ? (match._id as any).toString() : null,
      matchedUser: matchedUserProfile ? this.toUserProfileResponse(matchedUserProfile, photos) : null,
    };
  }
}
