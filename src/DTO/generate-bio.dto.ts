import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateBioDto {
  @ApiProperty({
    description: 'User prompt or ideas for bio generation',
    example: 'I love traveling, coffee, and reading books. I work as a software engineer and enjoy hiking on weekends.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Prompt must be at least 10 characters long' })
  @MaxLength(500, { message: 'Prompt must not exceed 500 characters' })
  prompt: string;
}

