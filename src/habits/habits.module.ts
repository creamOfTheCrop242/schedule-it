import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from 'src/accounts/account.module';
import { Log } from 'src/logs/entities/log.entity';
import { Habit } from './entities/habit.entity';
import { HabitsController } from './habits.controller';
import { HabitsService } from './habits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Habit, Log]), AccountModule],
  controllers: [HabitsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}
