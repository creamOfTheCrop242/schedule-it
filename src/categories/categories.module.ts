import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Log } from 'src/logs/entities/log.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Log, Task])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
