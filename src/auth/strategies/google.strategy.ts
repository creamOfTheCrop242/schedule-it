import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID:
        '440415511907-lhli09qnk4pusci9n72oemvh7ssm71mb.apps.googleusercontent.com',
      clientSecret: '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',
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
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
      accessToken,
    };

    done(null, user);
  }
}
