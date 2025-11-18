import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FacebookLoginDto {
  @ApiProperty({ description: 'Access Token từ Facebook' })
  @IsString()
  accessToken: string;


}