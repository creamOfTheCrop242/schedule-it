import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { AccountService } from 'src/accounts/services/account/account.service';
import {
  AuthLoginRequestDto,
  AuthStatus,
  ForgotUserNameDto,
} from 'src/auth/dto/auth.dto';

@Injectable()
export class AuthService {
  private transporter;
  constructor(
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
  ) {
    // this.transporter = nodemailer.createTransport({
    //   host: 'smtp.elasticemail.com', // Replace with your SMTP server
    //   port: 2525, // Replace with your SMTP port (e.g., 465 for SSL or 587 for TLS)
    //   secure: false, // Use true for 465, false for other ports
    //   auth: {
    //     user: 'dhudson0242@gmail.com', // Your email address
    //     pass: '5A9903A61E29B103BE31332A203AFB1DC337', // Your email password or app password
    //   },
    // });
  }

  async validateToken(token: string) {
    try {
      this.jwtService.verify(token);
      return { isLoggedIn: true };
    } catch (error) {
      console.error('Token verification failed:', error.message);
      throw new HttpException('Invalid Token', 401);
    }
  }

  async validateFacebookToken(facebookToken: string) {}

  async validateUser(request: AuthLoginRequestDto) {
    let account;

    account = await this.accountService.findAccountByEmail(request.email);

    if (account) {
      const isMatch = await bcrypt.compare(request.password, account.password);
      if (isMatch) {
        const token = this.jwtService.sign({
          email: account.email,
          id: account.id,
        });
        return { token };
      }

      if (!isMatch) {
        throw new HttpException('invalid credentials', 401);
      }
    }

    throw new HttpException('User not found', 404);
  }

  async forgotUsername(request: ForgotUserNameDto) {
    const account = await this.accountService.findAccountByEmail(request.email);

    if (account) {
      const isMatch = await bcrypt.compare(request.password, account.password);

      if (isMatch) {
        return account.email;
      }

      if (!isMatch) {
        throw new HttpException('invalid credentials', 401);
      }
    } else {
      throw new HttpException('User not found', 404);
    }
  }

  // async forgotPassword(request: ForgotPasswordDto) {
  //   const account = await this.accountService.findAccountByEmail(request.email);
  //   const password = generateRandomString(10);
  //   account.password = await bcrypt.hash(password, 10);
  //   this.accountService.saveAccount(account);

  //   console.log(password);
  //   const mailOptions = {
  //     from: '"Don" <don@creamofthecrop.tech>', // Sender address
  //     to: account.email, // Recipient address
  //     subject: 'Test Email', // Subject
  //     text: `Your new password is ${password}. It can be changed in your profile settings`, // Plain text body
  //   };

  //   try {
  //     const info = await this.transporter.sendMail(mailOptions);
  //     console.log('Email sent:', info.response);
  //     return {
  //       response: 'Your temporary password has been sent to your email',
  //     };
  //   } catch (error) {
  //     console.error('Error sending email:', error);
  //     return { error: 'Failed to send the email. Please try again.' };
  //   }
  // }
}
