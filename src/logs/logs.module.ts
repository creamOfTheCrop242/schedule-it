import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/accounts/account.module';
import { LogController } from './controllers/logs/logs.controller';
import { Log } from './entities/log.entity';
import { LogInsightsService } from './services/log-insights/log-insights.service';
import { LogService } from './services/log/log.service';
import { Task } from 'src/tasks/entities/task.entity';
import { JwtService } from '@nestjs/jwt';
import { GoalsModule } from 'src/goals/goals.module';
import { HabitsModule } from 'src/habits/habits.module';
import { PersonalGoalsModule } from 'src/personal-goals/personal-goals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, Task]),
    AccountModule,
    GoalsModule,
    HabitsModule,
    PersonalGoalsModule,
  ],
  controllers: [LogController],
  providers: [LogService, LogInsightsService, JwtService],
  exports: [LogService],
})
export class LogsModule {}
