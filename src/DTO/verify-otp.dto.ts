import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail({}, { message: 'Email invalid' })
    email: string;

    @IsNotEmpty({ message: 'Please enter OTP' })
    @Matches(/^\d{4}$/, { message: 'OTP must consist of 4 numeric characters' })
    otp: string;
}
