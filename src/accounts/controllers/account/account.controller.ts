import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from 'src/accounts/services/account/account.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { UpdateAccountDto, UpdatePasswordDto } from '../../dto/account.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Req() req: any) {
    return this.accountService.getCurrentUser(req.user.id);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  getAccounts() {
    return this.accountService.getAccounts();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getAccount(@Param('id') id: string) {
    return this.accountService.findAccountById(id);
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  updateAccount(@Body() request: UpdateAccountDto) {
    return this.accountService.updateAccount(request);
  }

  @Put('update-password')
  @UseGuards(JwtAuthGuard)
  updatePassword(@Body() request: UpdatePasswordDto) {
    return this.accountService.updatePassword(request);
  }

  @Delete('delete/:id')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@Param('id') id: string) {
    return this.accountService.deleteAccount(id);
  }
}
