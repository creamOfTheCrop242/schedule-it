import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from 'src/accounts/account.module';
import { LogsModule } from 'src/logs/logs.module';
import { Task } from 'src/tasks/entities/task.entity';
import { TasksController } from 'src/tasks/controllers/tasks.controller';
import { TasksService } from 'src/tasks/services/tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AccountModule,
    LogsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
