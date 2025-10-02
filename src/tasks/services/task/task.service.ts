import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Task } from 'src/tasks/entities/task.entity';
import {
  CreateTaskDto,
  GetTasksRequest,
  UpdateTaskDto,
} from 'src/tasks/models/tasks.model';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
  ) {}

  async create(createTaskDto: CreateTaskDto, accountId: string): Promise<Task> {
    const { dependencyTaskId, ...rest } = createTaskDto;

    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    let dependencyTask = null;
    if (dependencyTaskId) {
      dependencyTask = await this.taskRepository.findOne({
        where: { id: dependencyTaskId },
      });
    }

    const task = this.taskRepository.create({
      ...rest,
      account,
      dependencyTask,
    });

    console.log(task);

    return this.taskRepository.save(task);
  }

  async findAll(request: GetTasksRequest = {}): Promise<Task[]> {
    const { timeframe, status } = request;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.dependencyTask', 'dependencyTask')
      .leftJoinAndSelect('task.notes', 'notes')
      .where('task.deletedAt IS NULL');

    // Apply status filter
    if (status === 'complete') {
      queryBuilder.andWhere('task.completed = :completed', { completed: true });
    } else if (status === 'incomplete') {
      queryBuilder.andWhere('task.completed = :completed', {
        completed: false,
      });
    }
    const tasks = await queryBuilder.getMany();
    console.log(tasks);

    // Apply timeframe filter
    if (timeframe) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now; // End date is always the present datetime

      switch (timeframe) {
        case 'day':
          startDate = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
          );
          queryBuilder.andWhere(
            'task.createdAt >= :startDate AND task.createdAt <= :endDate',
            {
              startDate,
              endDate,
            },
          );
          console.log(startDate);
          console.log(endDate);
          // console.log(await queryBuilder.getMany()[0]);
          break;

        case 'week':
          // Get the start of the week (Monday)
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday (0), go back 6 days to Monday
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() + daysToMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          startDate = startOfWeek;

          queryBuilder.andWhere(
            'task.dueDate >= :startDate AND task.dueDate <= :endDate',
            {
              startDate,
              endDate,
            },
          );
          break;

        case 'month':
          // Start of current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          queryBuilder.andWhere(
            'task.dueDate >= :startDate AND task.dueDate <= :endDate',
            {
              startDate,
              endDate,
            },
          );
          break;

        case 'year':
          // Start of current year
          startDate = new Date(now.getFullYear(), 0, 1);
          queryBuilder.andWhere(
            'task.dueDate >= :startDate AND task.dueDate <= :endDate',
            {
              startDate,
              endDate,
            },
          );
          break;

        default:
          // No timeframe filter applied
          break;
      }
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['account', 'dependencyTask', 'notes'],
      withDeleted: false,
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(updateTaskDto: UpdateTaskDto, id: string): Promise<Task> {
    const task = await this.taskRepository.preload({
      id,
      ...updateTaskDto,
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const result = await this.taskRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }

  async getTaskCounts(
    accountId?: string,
  ): Promise<{ completed: number; incomplete: number; total: number }> {
    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (accountId) {
      queryBuilder.where('task.account.id = :accountId', { accountId });
    }

    const [completed, incomplete] = await Promise.all([
      queryBuilder
        .clone()
        .andWhere('task.completed = :completed', { completed: true })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('task.completed = :completed', { completed: false })
        .getCount(),
    ]);

    return { completed, incomplete, total: completed + incomplete };
  }
}
