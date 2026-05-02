import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from 'src/accounts/account.module';
import { Log } from 'src/logs/entities/log.entity';
import { PersonalGoal } from './entities/personal-goal.entity';
import { PersonalGoalAdviceService } from './personal-goal-advice.service';
import { PersonalGoalsController } from './personal-goals.controller';
import { PersonalGoalsService } from './personal-goals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalGoal, Log]),
    AccountModule,
  ],
  controllers: [PersonalGoalsController],
  providers: [PersonalGoalsService, PersonalGoalAdviceService],
  exports: [PersonalGoalsService],
})
export class PersonalGoalsModule {}
