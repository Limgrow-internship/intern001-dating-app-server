import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwipeDto {
  @ApiProperty({
    description: 'ID of the user being swiped on',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @ApiProperty({
    description: 'Swipe action',
    enum: ['like', 'pass'],
    example: 'like',
  })
  @IsEnum(['like', 'pass'])
  action: 'like' | 'pass';

  @ApiProperty({
    description: 'Recommendation score at time of swipe (optional)',
    example: 85.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  score?: number;
}
