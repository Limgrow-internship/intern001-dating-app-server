import { ApiProperty } from '@nestjs/swagger';
import { PhotoResponseDto, LocationResponseDto } from './match-card-response.dto';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'Profile ID', example: 'profile_123' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user_456' })
  userId: string;

  @ApiProperty({ description: 'First name', example: 'Anna' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Smith' })
  lastName: string;

  @ApiProperty({ description: 'Display name', example: 'Anna S.' })
  displayName: string;

  @ApiProperty({ description: 'Avatar URL', example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatar: string | null;

  @ApiProperty({ description: 'Bio', nullable: true })
  bio: string | null;

  @ApiProperty({ description: 'Age', example: 25, nullable: true })
  age: number | null;

  @ApiProperty({ description: 'Gender', example: 'female', nullable: true })
  gender: string | null;

  @ApiProperty({ description: 'Interests', example: ['hiking', 'coffee'], nullable: true })
  interests: string[] | null;

  @ApiProperty({ description: 'Relationship mode', example: 'serious', nullable: true })
  relationshipMode: string | null;

  @ApiProperty({ description: 'Height in cm', example: 165, nullable: true })
  height: number | null;

  @ApiProperty({ description: 'Weight in kg', example: 55, nullable: true })
  weight: number | null;

  @ApiProperty({ description: 'Location', type: LocationResponseDto, nullable: true })
  location: LocationResponseDto | null;

  @ApiProperty({ description: 'Occupation', nullable: true })
  occupation: string | null;

  @ApiProperty({ description: 'Company', nullable: true })
  company: string | null;

  @ApiProperty({ description: 'Education', nullable: true })
  education: string | null;

  @ApiProperty({ description: 'Zodiac sign', nullable: true })
  zodiacSign: string | null;

  @ApiProperty({ description: 'Photos', type: [PhotoResponseDto], nullable: true })
  photos: PhotoResponseDto[] | null;

  @ApiProperty({ description: 'Profile completeness (0-100)', example: 85, nullable: true })
  profileCompleteness: number | null;

  @ApiProperty({ description: 'Profile views count', example: 1250, nullable: true })
  profileViews: number | null;

  @ApiProperty({ description: 'Created at (ISO 8601)', example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Updated at (ISO 8601)', example: '2025-01-18T10:00:00.000Z' })
  updatedAt: string;
}

export class MatchResultResponseDto {
  @ApiProperty({ description: 'Whether a mutual match occurred', example: true })
  isMatch: boolean;

  @ApiProperty({ description: 'Match ID if matched', example: 'match_789', nullable: true })
  matchId: string | null;

  @ApiProperty({ description: 'Matched user profile', type: UserProfileResponseDto, nullable: true })
  matchedUser: UserProfileResponseDto | null;
}
