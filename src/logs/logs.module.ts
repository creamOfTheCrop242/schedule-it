import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/accounts/account.module';
import { LogController } from './controllers/logs/logs.controller';
import { Log } from './entities/log.entity';
import { LogService } from './services/log/log.service';
import { Task } from 'src/tasks/entities/task.entity';
import { JwtService } from '@nestjs/jwt';
import { GoalsModule } from 'src/goals/goals.module';
import { HabitsModule } from 'src/habits/habits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, Task]),
    AccountModule,
    GoalsModule,
    HabitsModule,
  ],
  controllers: [LogController],
  providers: [LogService, JwtService],
  exports: [LogService],
})
export class LogsModule {}
