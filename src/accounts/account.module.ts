import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';
import { AccountController } from './controllers/account/account.controller';
import { Account } from './entities/account.entity';
import { AccountService } from './services/account/account.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account, EmailVerification])],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
