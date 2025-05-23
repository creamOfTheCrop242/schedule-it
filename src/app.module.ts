import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { serverConfig } from './config/server-config';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './accounts/account.module';
import { MailService } from './mail/mail.service';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(serverConfig),
    AuthModule,
    AccountModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
