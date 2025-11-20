import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './match-result-response.dto';
import { MatchCardResponseDto } from './match-card-response.dto';

export enum MatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  EXPIRED = 'expired',
  UNMATCHED = 'unmatched',
}

export class MatchResponseDto {
  @ApiProperty({ description: 'Match ID', example: 'match_789' })
  id: string;

  @ApiProperty({ description: 'Current user ID', example: 'user_123' })
  userId: string;

  @ApiProperty({ description: 'Matched user ID', example: 'user_456' })
  matchedUserId: string;

  @ApiProperty({ description: 'Matched user profile', type: UserProfileResponseDto })
  matchedUser: UserProfileResponseDto;

  @ApiProperty({ description: 'Match status', enum: MatchStatus, example: 'matched' })
  status: MatchStatus;

  @ApiProperty({ description: 'Created at (ISO 8601)', example: '2025-01-18T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Matched at (ISO 8601)', example: '2025-01-18T10:05:00.000Z', nullable: true })
  matchedAt: string | null;
}

export class MatchesListResponseDto {
  @ApiProperty({ description: 'Array of matches', type: [MatchResponseDto] })
  matches: MatchResponseDto[];

  @ApiProperty({ description: 'Total count', example: 45, nullable: true })
  total: number | null;

  @ApiProperty({ description: 'Current page', example: 1, nullable: true })
  page: number | null;

  @ApiProperty({ description: 'Items per page', example: 20, nullable: true })
  limit: number | null;
}

export class MatchCardsListResponseDto {
  @ApiProperty({ description: 'Array of match cards', type: [MatchCardResponseDto] })
  cards: MatchCardResponseDto[];

  @ApiProperty({ description: 'Whether more cards available', example: true, nullable: true })
  hasMore: boolean | null;
}
