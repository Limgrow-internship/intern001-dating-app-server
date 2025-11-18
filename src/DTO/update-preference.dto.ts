import {
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferenceDto {
  @ApiProperty({
    description: 'Minimum age preference',
    minimum: 18,
    maximum: 100,
    example: 22,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  ageMin?: number;

  @ApiProperty({
    description: 'Maximum age preference',
    minimum: 18,
    maximum: 100,
    example: 35,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  ageMax?: number;

  @ApiProperty({
    description: 'Gender preferences',
    enum: ['male', 'female', 'other', 'all'],
    isArray: true,
    example: ['male', 'female'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['male', 'female', 'other', 'all'], { each: true })
  genderPreference?: string[];

  @ApiProperty({
    description: 'Maximum distance in kilometers',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDistance?: number;

  @ApiProperty({
    description: 'Dating mode preference',
    enum: ['dating', 'friend'],
    example: 'dating',
    required: false,
  })
  @IsOptional()
  @IsEnum(['dating', 'friend'])
  mode?: string;

  @ApiProperty({
    description: 'Specific interests to filter by',
    example: ['travel', 'coding', 'music'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  interests?: string[];
}
