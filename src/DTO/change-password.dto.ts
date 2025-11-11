import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    oldPassword: string;

    @IsString()
    newPassword: string;

    @IsString()
    confirmPassword: string;

    @IsString()
    deviceInfo: string;
}
