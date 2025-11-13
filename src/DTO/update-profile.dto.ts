import { IsString, IsOptional, IsDateString, IsArray, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

    @ApiPropertyOptional({ description: 'List of interests', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];

    @ApiPropertyOptional({ description: 'Location of the user' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: 'Mode of the user' })
    @IsOptional()
    @IsString()
    mode?: string;

    @ApiPropertyOptional({ description: 'Age of the user (18-100)', minimum: 18, maximum: 100 })
    @IsOptional()
    @IsNumber()
    @Min(18)
    @Max(100)
    age?: number;
}
