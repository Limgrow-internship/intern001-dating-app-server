import { IsString } from 'class-validator';

export class LoginWithGoogleDto {
    @IsString()
    idToken: string;
}
