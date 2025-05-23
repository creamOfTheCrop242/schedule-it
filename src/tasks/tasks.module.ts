import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskController } from './controllers/tasks/tasks.controller';
import { TaskService } from './services/task/task.service';
import { AccountService } from 'src/accounts/services/account/account.service';
import { AccountModule } from 'src/accounts/account.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), AccountModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TasksModule {}
