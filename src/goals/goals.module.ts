import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalDefinition } from './entities/goal-definition.entity';
import { GoalProgress } from './entities/goal-progress.entity';
import { GoalsController } from './controllers/goals.controller';
import { GoalsService } from './services/goals.service';

@Module({
  imports: [TypeOrmModule.forFeature([GoalDefinition, GoalProgress])],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
