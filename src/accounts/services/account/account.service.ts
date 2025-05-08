import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import {
  FacebookAccount,
  GoogleAccount,
  UpdateAccountDto,
  UpdatePasswordDto,
  VerifyEmailDto,
} from 'src/accounts/dto/account.dto';
import { Account } from 'src/accounts/entities/account.entity';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
  ) {}

  async createAccount(request: VerifyEmailDto) {
    const verificationObj = await this.emailVerificationRepository.findOne({
      where: { email: request.email },
    });

    if (verificationObj?.code !== request.code) {
      throw new HttpException('Incorrect Verification Code', 500);
    }

    const tempAccount = JSON.parse(verificationObj.accountDetails);
    const account = this.accountRepository.create({
      email: request.email,
      name: tempAccount.name,
      password: tempAccount.password,
    });

    verificationObj.verified = true;
    verificationObj.code = null;
    this.emailVerificationRepository.save(verificationObj);
    return await this.accountRepository.save(account);
  }

  async handleOAuthAccount(
    request: GoogleAccount | FacebookAccount,
    provider: 'google' | 'facebook',
  ) {
    const providerIdKey = provider === 'google' ? 'googleId' : 'facebookId';
    const { email, name, photo } = request;

    const existingAccount = await this.accountRepository.findOne({
      where: { email },
    });

    if (!existingAccount) {
      // Create new account if it doesn't exist
      return this.accountRepository.save(
        this.accountRepository.create({
          email,
          [providerIdKey]: request[providerIdKey], // Dynamically assign the correct field
          name,
          profileImage: photo,
        }),
      );
    }

    if (!existingAccount[providerIdKey]) {
      // Update existing account only if it doesn't have a provider ID
      Object.assign(existingAccount, {
        [providerIdKey]: request[providerIdKey],
        profileImage: photo,
      });
      return this.accountRepository.save(existingAccount);
    }

    return existingAccount;
  }

  async findAccountById(id: string) {
    return await this.accountRepository.findOne({
      where: { id: parseInt(id) },
    });
  }

  async findAccountByEmail(email: string) {
    return await this.accountRepository.findOne({
      where: { email },
    });
  }

  async getAccounts() {
    return await this.accountRepository.find();
  }

  async deleteAccount(id: string) {
    return await this.accountRepository.softDelete({ id: parseInt(id) });
  }

  async updateAccount(request: UpdateAccountDto) {
    const account = await this.accountRepository.findOne({
      where: { id: request.id },
    });

    account.email = request.email || account.email;
    account.name = request.name || account.name;

    return await this.accountRepository.save(account);
  }

  async updatePassword(request: UpdatePasswordDto) {
    const account = await this.findAccountById(request.id);

    account.password =
      (await bcrypt.hash(request.password, 10)) || account.password;
    console.log(account.password);

    return await this.accountRepository.save(account);
  }

  async saveAccount(account: Account) {
    return await this.accountRepository.save(account);
  }
}
