import { Module } from '@nestjs/common';
import { AccountController } from './controllers/account/account.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { AccountService } from './services/account/account.service';
import { MailService } from 'src/mail/mail.service';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, EmailVerification])],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
