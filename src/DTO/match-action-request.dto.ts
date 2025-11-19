import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class MatchActionRequestDto {
  @ApiProperty({ description: 'Target user ID to perform action on', example: 'user_456' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class BlockUserRequestDto {
  @ApiProperty({ description: 'User ID to block', example: 'user_456' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({ description: 'Block reason', example: 'inappropriate_content', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UnmatchRequestDto {
  @ApiProperty({ description: 'Match ID to unmatch', example: 'match_789' })
  @IsString()
  @IsNotEmpty()
  matchId: string;
}
