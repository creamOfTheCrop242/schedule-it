import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AccountService } from 'src/accounts/services/account/account.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { UpdateAccountDto, UpdatePasswordDto } from '../../dto/account.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string | number };
}

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return this.accountService.getCurrentUser(req.user.id);
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  updateAccount(@Req() req: AuthenticatedRequest, @Body() body: UpdateAccountDto) {
    return this.accountService.updateAccount(req.user.id, body);
  }

  @Put('update-password')
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdatePasswordDto,
  ) {
    return this.accountService.updatePassword(req.user.id, body);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@Req() req: AuthenticatedRequest) {
    return this.accountService.deleteAccount(String(req.user.id));
  }
}
