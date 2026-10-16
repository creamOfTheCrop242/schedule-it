import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

/** Google OAuth guard for the native app callback. The web callback remains unchanged. */
@Injectable()
export class NativeGoogleGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const baseUrl = this.configService.get<string>('BASE_URL');
    return {
      callbackURL: `${baseUrl}/auth/google/native/callback`,
      state: typeof request.query?.state === 'string' ? request.query.state : undefined,
      prompt: 'select_account',
    };
  }
}
