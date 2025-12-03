import { ApiProperty } from '@nestjs/swagger';

export class LikeResponseDto {
  @ApiProperty({ description: 'Action succeeded', example: true })
  success: boolean;

  @ApiProperty({ description: 'Action type', example: 'LIKE' })
  action: string;

  @ApiProperty({ description: 'Match was created', example: false })
  matchCreated: boolean;

  @ApiProperty({
    description: 'Match ID if match was created',
    example: 'match_uuid',
    nullable: true,
  })
  matchId?: string;

  @ApiProperty({
    description: 'Conversation ID if match was created',
    example: 'conv_uuid',
    nullable: true,
  })
  conversationId?: string;

  @ApiProperty({
    description: 'Remaining likes for today',
    example: 29,
    nullable: true,
  })
  remainingLikes?: number | string;

  @ApiProperty({
    description: 'Success message',
    example: 'Like recorded successfully',
  })
  message: string;
}

export class SuperLikeResponseDto {
  @ApiProperty({ description: 'Action succeeded', example: true })
  success: boolean;

  @ApiProperty({ description: 'Action type', example: 'SUPERLIKE' })
  action: string;

  @ApiProperty({ description: 'Match was created', example: false })
  matchCreated: boolean;

  @ApiProperty({
    description: 'Match ID if match was created',
    example: 'match_uuid',
    nullable: true,
  })
  matchId?: string;

  @ApiProperty({
    description: 'Conversation ID if match was created',
    example: 'conv_uuid',
    nullable: true,
  })
  conversationId?: string;

  @ApiProperty({
    description: 'Remaining SuperLikes for today',
    example: 2,
    nullable: true,
  })
  remainingSuperLikes?: number | string;

  @ApiProperty({
    description: 'Notification was sent to target user',
    example: true,
  })
  notificationSent: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'SuperLike sent! They will see a special notification.',
  })
  message: string;
}

export class DislikeResponseDto {
  @ApiProperty({ description: 'Action succeeded', example: true })
  success: boolean;

  @ApiProperty({ description: 'Action type', example: 'DISLIKE' })
  action: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Profile will not be shown again',
  })
  message: string;
}

export class QuotaResponseDto {
  @ApiProperty({ description: 'Subscription tier', example: 'GOLD' })
  subscriptionTier: string;

  @ApiProperty({ description: 'Current date', example: '2024-11-19' })
  date: string;

  @ApiProperty({
    description: 'When quota resets',
    example: '2024-11-20T00:00:00Z',
  })
  resetAt: string;

  @ApiProperty({ description: 'Action quotas' })
  actions: {
    likes: {
      dailyLimit: number | null;
      usedToday: number;
      remaining: number | string;
    };
    superLikes: {
      dailyLimit: number | null;
      usedToday: number;
      remaining: number | string;
    };
    rewinds: {
      dailyLimit: number | null;
      usedToday: number;
      remaining: number | string;
    };
  };
}
