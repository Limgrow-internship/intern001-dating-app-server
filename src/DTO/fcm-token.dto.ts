import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFcmTokenDto {
  @ApiProperty({ 
    description: 'FCM token from Firebase', 
    example: 'fcm_token_here' 
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}

