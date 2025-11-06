import { IsEmail, Matches, MinLength } from 'class-validator';

export class Login {
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/, { message: 'invalid email' })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, { message: 'Password must be at least 1 letter and 1 number' })
  password: string;
}