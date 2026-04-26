import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Log } from 'src/logs/entities/log.entity';
import { Task } from 'src/tasks/entities/task.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  /** Distinct non-empty category labels across logs and tasks for the account. */
  async distinctCategoryLabels(accountId: string): Promise<string[]> {
    const accountIdNum = parseInt(accountId, 10);
    if (Number.isNaN(accountIdNum)) {
      return [];
    }

    const logRaw = await this.logRepository
      .createQueryBuilder('log')
      .select('log.category', 'cat')
      .where('log.accountId = :id', { id: accountIdNum })
      .andWhere('log.deletedAt IS NULL')
      .andWhere('log.category IS NOT NULL')
      .andWhere(`TRIM(log.category) != ''`)
      .distinct(true)
      .getRawMany();

    const taskRaw = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.category', 'cat')
      .where('task.accountId = :id', { id: accountIdNum })
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.category IS NOT NULL')
      .andWhere(`TRIM(task.category) != ''`)
      .distinct(true)
      .getRawMany();

    const labels = new Set<string>();
    for (const row of logRaw) {
      const c = (row as { cat: string }).cat?.trim();
      if (c) labels.add(c);
    }
    for (const row of taskRaw) {
      const c = (row as { cat: string }).cat?.trim();
      if (c) labels.add(c);
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }
}
