import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AccountService } from 'src/accounts/services/account/account.service';
import { CONFIG_SECRETS } from 'src/config/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
  ) {
    super({
      clientID: CONFIG_SECRETS.FACEBOOK_APP_ID, // Use environment variables for security
      clientSecret: CONFIG_SECRETS.FACEBOOK_APP_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      facebookId: id,
      email: emails?.[0]?.value || null,
      name: name?.givenName || '',
      photo: photos?.[0]?.value || '',
      token: accessToken, // Store for future API calls if needed
    };

    const account = await this.accountService.handleOAuthAccount(
      user,
      'facebook',
    );

    return this.jwtService.sign({
      id: account.id,
      email: account.email,
    });
  }
}
