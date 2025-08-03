import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AccountService } from 'src/accounts/services/account/account.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: `${configService.get<string>('BASE_URL')}/auth/facebook/callback`,
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
