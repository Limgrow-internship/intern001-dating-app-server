import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginWithGoogleDto {
    @ApiProperty({ description: 'Access Token từ Google' })
    @IsString()
    accessToken: string;
}
