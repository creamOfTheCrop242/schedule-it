import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { CONFIG_SECRETS } from 'src/config/config';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from 'src/accounts/services/account/account.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
  ) {
    super({
      clientID:
        '440415511907-lhli09qnk4pusci9n72oemvh7ssm71mb.apps.googleusercontent.com',
      clientSecret: CONFIG_SECRETS.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      prompt: 'consent',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      name: displayName,
      photo: photos[0].value,
      token: accessToken,
    };

    const account = await this.accountService.handleOAuthAccount(
      user,
      'google',
    );

    const token = this.jwtService.sign({
      id: account.id,
      email: account.email,
    });

    done(null, token);
  }
}
