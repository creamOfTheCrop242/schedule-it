import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { RegisterAccountDto } from 'src/accounts/dto/account.dto';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CONFIG_SECRETS } from 'src/config/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: Repository<EmailVerification>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.elasticemail.com', // Replace with your SMTP server
      port: 2525, // Replace with your SMTP port (e.g., 465 for SSL or 587 for TLS)
      secure: false, // Use true for 465, false for other ports
      auth: {
        user: 'dhudson0242@gmail.com', // Your email address
        pass: CONFIG_SECRETS.ELASTIC_MAIL_PASSWORD, // Your email password or app password
      },
    });
  }

  async sendVerificationEmail(request: RegisterAccountDto) {
    if (!request.email || !request.name || !request.password) {
      throw new HttpException('Missing Fields', 500);
    }

    const hash = await bcrypt.hash(request.password, 10);
    request.password = hash;

    const verificationCode = this.verificationCode().toString();
    this.emailVerificationRepository.save({
      code: verificationCode,
      email: request.email,
      accountDetails: JSON.stringify(request),
    });

    const mailOptions = {
      from: '"Schedule-It" <don@creamofthecrop.tech>', // Sender address
      to: request.email, // Recipient address
      subject: `Email Verification Code is ${verificationCode}`, // Subject
      text: `Your confirmation Code is ${verificationCode}`, // Plain text body
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  verificationCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }
}
