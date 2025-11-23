import { IsString, IsOptional, IsDateString, IsArray, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
    @ApiPropertyOptional({ description: 'First name of the user' })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name of the user' })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiPropertyOptional({ description: 'Date of birth in ISO format' })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({ description: 'Gender of the user', enum: ['male', 'female', 'other'] })
    @IsOptional()
    @IsString()
    @IsIn(['male', 'female', 'other'])
    gender?: string;

    @ApiPropertyOptional({ description: 'Bio description' })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({ description: 'Profile picture URL' })
    @IsOptional()
    @IsString()
    profilePicture?: string;

    @ApiPropertyOptional({ description: 'Profile image URL (alias for profilePicture)' })
    @IsOptional()
    @IsString()
    @Transform(({ value, obj }) => {
        if (value && !obj.profilePicture) {
            obj.profilePicture = value;
        }
        return undefined;
    })
    profileImageUrl?: string;

    @ApiPropertyOptional({ description: 'List of interests', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];

    @ApiPropertyOptional({
        description: 'Location of the user - can be string (city name) or object with longitude and latitude',
        oneOf: [
            { type: 'string' },
            { type: 'object', properties: { longitude: { type: 'number' }, latitude: { type: 'number' } } }
        ]
    })
    @IsOptional()
    location?: string | { longitude: number; latitude: number };

    @ApiPropertyOptional({ description: 'Age of the user (18-100)', minimum: 18, maximum: 100 })
    @IsOptional()
    @IsNumber()
    @Min(18)
    @Max(100)
    age?: number;

    @ApiPropertyOptional({ description: 'Mode: dating or friend', enum: ['dating', 'friend', 'Dating Mode', 'Friend Mode'] })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (value === 'Dating Mode') return 'dating';
        if (value === 'Friend Mode') return 'friend';
        return value;
    })
    @IsIn(['dating', 'friend'])
    mode?: string;

    @ApiPropertyOptional({ description: 'Occupation of the user' })
    @IsOptional()
    @IsString()
    occupation?: string;

    @ApiPropertyOptional({ description: 'Company name' })
    @IsOptional()
    @IsString()
    company?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ description: 'Country' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Height in centimeters (120-220)', minimum: 120, maximum: 220 })
    @IsOptional()
    @IsNumber()
    @Min(120)
    @Max(220)
    height?: number;

    @ApiPropertyOptional({ description: 'Weight in kilograms (30-300)', minimum: 30, maximum: 300 })
    @IsOptional()
    @IsNumber()
    @Min(30)
    @Max(300)
    weight?: number;

    @ApiPropertyOptional({ description: 'Goals/objectives', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    goals?: string[];

    @ApiPropertyOptional({ description: 'Job title' })
    @IsOptional()
    @IsString()
    job?: string;

    @ApiPropertyOptional({ description: 'Education level or institution' })
    @IsOptional()
    @IsString()
    education?: string;

    @ApiPropertyOptional({ description: 'Zodiac sign', enum: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] })
    @IsOptional()
    @IsString()
    @IsIn(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'])
    zodiac?: string;

    @ApiPropertyOptional({ description: 'Zodiac sign (alias for zodiac)', enum: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] })
    @IsOptional()
    @IsString()
    @IsIn(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'])
    zodiacSign?: string;

    @ApiPropertyOptional({
        description: 'Answers to open questions',
        type: 'object',
        additionalProperties: { type: 'string' }
    })
    @IsOptional()
    openQuestionAnswers?: Record<string, string>;
}
