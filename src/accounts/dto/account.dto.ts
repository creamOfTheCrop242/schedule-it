export class RegisterAccountDto {
  name: string;
  email?: string;
  password: string;
}

export interface UpdateAccountDto {
  name?: string;
  email?: string;
}

export interface UpdatePasswordDto {
  password: string;
}

export interface VerifyEmailDto {
  email: string;
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
