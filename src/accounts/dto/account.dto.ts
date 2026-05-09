import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

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

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** IANA timezone for scheduled log summaries (e.g. America/New_York). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(64)
  summaryTimeZone?: string | null;
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
