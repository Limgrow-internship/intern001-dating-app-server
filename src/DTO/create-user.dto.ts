import { IsEmail, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalid' })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, { message: 'Password must be at least 1 letter and 1 number' })
  password: string;
}

