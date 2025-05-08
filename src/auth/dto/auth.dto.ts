export class AuthLoginRequestDto {
  email: string;
  password: string;
}

export class ForgotUserNameDto {
  email: string;
  password: string;
}

export class ForgotPasswordDto {
  email: string;
}
export interface AuthenticatedLoginRequest extends Request {
  user: any;
}

export interface AuthStatus {
  isLoggedIn: boolean;
  method?: 'local' | 'facebook' | 'google';
  error?: any;
}
