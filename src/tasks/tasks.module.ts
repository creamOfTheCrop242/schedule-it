import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/accounts/account.module';
import { TaskController } from './controllers/tasks/tasks.controller';
import { Task } from './entities/task.entity';
import { TaskService } from './services/task/task.service';
import { JwtService } from '@nestjs/jwt';
import { GoalsModule } from 'src/goals/goals.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), AccountModule, GoalsModule],
  controllers: [TaskController],
  providers: [TaskService, JwtService],
})
export class TasksModule {}
