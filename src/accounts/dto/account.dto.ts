import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterAccountDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export interface UpdateAccountDto {
  name?: string;
  email?: string;
}

export interface UpdatePasswordDto {
  password: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  code: string;
}

export interface GoogleAccount {
  googleId: string;
  email: string;
  name: string;
  photo: string;
  token: string;
}

export interface FacebookAccount {
  facebookId: string;
  email: string;
  name: string;

  photo: string;
  token: string; // Store for future API calls if needed
}
