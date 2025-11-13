import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token to generate new access token' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
