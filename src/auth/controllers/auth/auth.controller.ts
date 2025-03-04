import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  AuthenticatedLoginRequest,
  ForgotPasswordDto,
} from 'src/auth/dto/auth.dto';

import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { LocalAuthGuard } from 'src/auth/guards/local.guard';
import { AuthService } from 'src/auth/services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() request: AuthenticatedLoginRequest) {
    return request.user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // This route will redirect users to the Google authentication page
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    return req.user; // This will contain the user info returned by Google
  }

  // @Get('status')
  // @UseGuards(JwtAuthGuard)
  // status(@Req() req: Request) {
  //   req.user;
  // }

  // @Post('forgot-password')
  // async forgotPassword(@Body() request: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(request);
  // }
}
