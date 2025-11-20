import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';

export class RangeResponseDto {
  @ApiProperty({ description: 'Minimum value', example: 22 })
  min: number;

  @ApiProperty({ description: 'Maximum value', example: 35 })
  max: number;
}

export class RecommendationCriteriaResponseDto {
  @ApiProperty({ description: 'Criteria ID', example: 'criteria_123', nullable: true })
  id: string | null;

  @ApiProperty({ description: 'Seeking gender preferences', example: ['female'], nullable: true })
  seekingGender: string[] | null;

  @ApiProperty({ description: 'Age range', type: RangeResponseDto, nullable: true })
  ageRange: RangeResponseDto | null;

  @ApiProperty({ description: 'Distance range in km', type: RangeResponseDto, nullable: true })
  distanceRange: RangeResponseDto | null;

  @ApiProperty({ description: 'Interest tags', example: ['hiking', 'coffee'], nullable: true })
  interests: string[] | null;

  @ApiProperty({ description: 'Relationship modes', example: ['serious'], nullable: true })
  relationshipModes: string[] | null;

  @ApiProperty({ description: 'Height range in cm', type: RangeResponseDto, nullable: true })
  heightRange: RangeResponseDto | null;
}

export class RecommendationCriteriaRequestDto {
  @ApiProperty({ description: 'Seeking gender', example: ['female'], required: false })
  @IsOptional()
  @IsArray()
  seekingGender?: string[];

  @ApiProperty({ description: 'Minimum age', example: 22, required: false })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  minAge?: number;

  @ApiProperty({ description: 'Maximum age', example: 35, required: false })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  maxAge?: number;

  @ApiProperty({ description: 'Maximum distance in km', example: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxDistance?: number;

  @ApiProperty({ description: 'Interest tags', example: ['hiking', 'coffee'], required: false })
  @IsOptional()
  @IsArray()
  interests?: string[];

  @ApiProperty({ description: 'Relationship modes', example: ['serious'], required: false })
  @IsOptional()
  @IsArray()
  relationshipModes?: string[];

  @ApiProperty({ description: 'Minimum height in cm', example: 160, required: false })
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(220)
  minHeight?: number;

  @ApiProperty({ description: 'Maximum height in cm', example: 180, required: false })
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(220)
  maxHeight?: number;
}
