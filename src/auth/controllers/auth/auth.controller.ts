import { HttpService } from '@nestjs/axios';
import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import {
  RegisterAccountDto,
  VerifyEmailDto,
} from 'src/accounts/dto/account.dto';
import { AccountService } from 'src/accounts/services/account/account.service';
import { AuthenticatedLoginRequest } from 'src/auth/dto/auth.dto';

import { LocalAuthGuard } from 'src/auth/guards/local.guard';
import { AuthService } from 'src/auth/services/auth/auth.service';
import { MailService } from 'src/mail/mail.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async createAccount(@Body() request: VerifyEmailDto, req, @Res() res: any) {
    const newAccount = await this.accountService.createAccount(request);

    if (newAccount) {
      const token = await this.jwtService.sign({
        email: newAccount.email,
        id: newAccount.id,
      });

      res.cookie('access_token', token, {
        httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
        secure: false, // ✅ Only send over HTTPS (set `false` for local dev)
        // sameSite: 'strict', // ✅ Protects against CSRF attacks
        maxAge: 60 * 60 * 1000, // ✅ Token expires in 1 hour
      });
    }

    return res.json(newAccount);
  }

  @Post('send-verify-code')
  async verifyEmail(@Body() request: RegisterAccountDto) {
    const hasExistingAccount = await this.accountService.findAccountByEmail(
      request.email,
    );

    if (!hasExistingAccount) {
      return this.mailService.sendVerificationEmail(request);
    } else {
      throw new HttpException('Error Account Exists', 500);
    }
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() request: AuthenticatedLoginRequest, @Res() res: Response) {
    res.cookie('access_token', request.user.token, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: false, // ✅ Only send over HTTPS (set `false` for local dev)
      // sameSite: 'strict', // ✅ Protects against CSRF attacks
      maxAge: 60 * 60 * 1000, // ✅ Token expires in 1 hour
    });
    console.log('cookie created');
    return res.json({ isloggedIn: true });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will redirect users to the Google authentication page
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: any) {
    res.cookie('access_token', req.user, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: false, // ✅ Only send over HTTPS (set `false` for local dev)
      // sameSite: 'strict', // ✅ Protects against CSRF attacks
      maxAge: 60 * 60 * 1000, // ✅ Token expires in 1 hour
    });

    return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}`);
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req, @Res() res: any) {
    res.cookie('access_token', req.user, {
      httpOnly: true, // ✅ Prevents JavaScript access (XSS protection)
      secure: false, // ✅ Only send over HTTPS (set `false` for local dev)
      // sameSite: 'strict', // ✅ Protects against CSRF attacks
      maxAge: 60 * 60 * 1000, // ✅ Token expires in 1 hour
    });

    return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}`);
  }

  @Get('status')
  status(@Req() req: Request) {
    const token = req.cookies['access_token'];

    return this.authService.validateToken(token);
  }

  // @Post('forgot-password')
  // async forgotPassword(@Body() request: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(request);
  // }
}
