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

  // Helper method for consistent cookie configuration
  private getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction, // true in production, false in dev
      sameSite: 'lax' as const, // Works for same-domain
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
    };
  }

  @Post('register')
  async createAccount(
    @Body() request: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const newAccount = await this.accountService.createAccount(request);

    if (newAccount) {
      const token = await this.jwtService.sign({
        email: newAccount.email,
        id: newAccount.id,
      });

      res.cookie('access_token', token, this.getCookieOptions());
    }

    return newAccount;
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
  async login(
    @Req() request: AuthenticatedLoginRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.cookie('access_token', request.user.token, this.getCookieOptions());
    return { isloggedIn: true };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will redirect users to the Google authentication page
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const token = req.user as string;

    res.cookie('access_token', token, this.getCookieOptions());

    const frontend = this.configService.get<string>('FRONTEND_URL')!;

    return res
      .status(200)
      .type('html')
      .send(
        `<html><head>
           <meta http-equiv="refresh" content="0; url='${frontend}'" />
         </head>
         <body>
           Redirecting…
           <script>location.replace(${JSON.stringify(frontend)});</script>
         </body></html>`,
      );
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthRedirect(@Req() req: Request, @Res() res: Response) {
    res.cookie('access_token', req.user, this.getCookieOptions());

    return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}`);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', this.getCookieOptions());
    return { message: 'Logged out successfully' };
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
