import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/accounts/account.module';
import { LogController } from './controllers/logs/logs.controller';
import { LogSummaryInternalController } from './controllers/log-summary-internal/log-summary-internal.controller';
import { Log } from './entities/log.entity';
import { LogPeriodSummary } from './entities/log-period-summary.entity';
import { LogInsightsService } from './services/log-insights/log-insights.service';
import { LogVoiceService } from './services/log-voice/log-voice.service';
import { LogPeriodSummaryCronService } from './services/log-period-summary/log-period-summary-cron.service';
import { LogPeriodSummaryGenerationService } from './services/log-period-summary/log-period-summary-generation.service';
import { LogPeriodSummaryReadService } from './services/log-period-summary/log-period-summary-read.service';
import { LogService } from './services/log/log.service';
import { Task } from 'src/tasks/entities/task.entity';
import { JwtService } from '@nestjs/jwt';
import { GoalsModule } from 'src/goals/goals.module';
import { HabitsModule } from 'src/habits/habits.module';
import { PersonalGoalsModule } from 'src/personal-goals/personal-goals.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Log, Task, LogPeriodSummary]),
    AccountModule,
    GoalsModule,
    HabitsModule,
    PersonalGoalsModule,
  ],
  controllers: [LogController, LogSummaryInternalController],
  providers: [
    LogService,
    LogInsightsService,
    LogVoiceService,
    LogPeriodSummaryGenerationService,
    LogPeriodSummaryReadService,
    LogPeriodSummaryCronService,
    JwtService,
  ],
  exports: [LogService],
})
export class LogsModule {}
