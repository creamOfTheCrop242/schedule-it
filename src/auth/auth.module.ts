import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccountModule } from 'src/accounts/account.module';
import {
  jwtConstants,
  JWT_ACCESS_TOKEN_TTL_SECONDS,
} from './constants/constants';
import { AuthController } from './controllers/auth/auth.controller';
import { AuthService } from './services/auth/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerification } from './entities/email-verification.entity';
import { MailService } from 'src/mail/mail.service';
import { FacebookStrategy } from './strategies/facebook.strategy';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([EmailVerification]),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: JWT_ACCESS_TOKEN_TTL_SECONDS },
    }),
    AccountModule,
    HttpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    MailService,
  ],
})
export class AuthModule {}
