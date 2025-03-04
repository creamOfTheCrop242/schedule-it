import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  RegisterAccountDto,
  UpdateAccountDto,
  UpdatePasswordDto,
} from 'src/accounts/dto/account.dto';
import { Account } from 'src/accounts/entities/account.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async createAccount(account: RegisterAccountDto) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(account.password, saltOrRounds);
    account.password = hash;
    return await this.accountRepository.save(account);
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
