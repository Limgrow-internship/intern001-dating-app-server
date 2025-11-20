import { ApiProperty } from '@nestjs/swagger';

export class PhotoResponseDto {
  @ApiProperty({ description: 'Photo URL', example: 'https://cdn.example.com/photos/1.jpg' })
  url: string;

  @ApiProperty({ description: 'Display order', example: 0, nullable: true })
  order: number | null;

  @ApiProperty({ description: 'Upload timestamp in ISO 8601', example: '2025-01-15T10:00:00.000Z', nullable: true })
  uploadedAt: string | null;
}

export class LocationResponseDto {
  @ApiProperty({ description: 'Latitude', example: 37.7749 })
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: -122.4194 })
  longitude: number;

  @ApiProperty({ description: 'City name', example: 'San Francisco', nullable: true })
  city: string | null;

  @ApiProperty({ description: 'Country name', example: 'USA', nullable: true })
  country: string | null;
}

export class MatchCardResponseDto {
  @ApiProperty({ description: 'Profile ID', example: 'profile_123' })
  id: string;

  @ApiProperty({ description: 'User account ID', example: 'user_456' })
  userId: string;

  @ApiProperty({ description: 'First name', example: 'Anna' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Smith' })
  lastName: string;

  @ApiProperty({ description: 'Display name', example: 'Anna S.', nullable: true })
  displayName: string | null;

  @ApiProperty({ description: 'Age', example: 25, nullable: true })
  age: number | null;

  @ApiProperty({ description: 'Gender', example: 'female', nullable: true })
  gender: string | null;

  @ApiProperty({ description: 'Primary avatar URL', example: 'https://cdn.example.com/avatars/anna.jpg', nullable: true })
  avatar: string | null;

  @ApiProperty({ description: 'Array of photos', type: [PhotoResponseDto], nullable: true })
  photos: PhotoResponseDto[] | null;

  @ApiProperty({ description: 'User bio', example: 'Love hiking and coffee ☕', nullable: true })
  bio: string | null;

  @ApiProperty({ description: 'Distance in kilometers', example: 5.2, nullable: true })
  distance: number | null;

  @ApiProperty({ description: 'Location details', type: LocationResponseDto, nullable: true })
  location: LocationResponseDto | null;

  @ApiProperty({ description: 'Occupation', example: 'Software Engineer', nullable: true })
  occupation: string | null;

  @ApiProperty({ description: 'Company', example: 'Tech Corp', nullable: true })
  company: string | null;

  @ApiProperty({ description: 'Education', example: 'Stanford University', nullable: true })
  education: string | null;

  @ApiProperty({ description: 'Interests', example: ['hiking', 'coffee', 'travel'], nullable: true })
  interests: string[] | null;

  @ApiProperty({ description: 'Relationship mode', example: 'serious', nullable: true })
  relationshipMode: string | null;

  @ApiProperty({ description: 'Height in centimeters', example: 165, nullable: true })
  height: number | null;

  @ApiProperty({ description: 'Zodiac sign', example: 'Aries', nullable: true })
  zodiacSign: string | null;

  @ApiProperty({ description: 'Verification status', example: true, nullable: true })
  isVerified: boolean | null;
}
