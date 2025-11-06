import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    email: string;

    @IsNotEmpty({ message: 'Vui lòng nhập mã xác thực' })
    @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 ký tự số' })
    otp: string;
}
