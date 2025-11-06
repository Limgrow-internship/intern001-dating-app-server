import { IsEmail, Matches, MinLength } from 'class-validator';

export class Login {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, { message: 'Mật khẩu phải có ít nhất 1 chữ và 1 số' })
  password: string;
}