import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Task } from 'src/tasks/entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';
import { GoalsService } from 'src/goals/services/goals.service';
import { GoalMetric } from 'src/goals/goals.model';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
    private readonly goalsService: GoalsService,
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

    return this.taskRepository.save(task);
  }

  /** Convert a local date string ("YYYY-MM-DD") into a UTC start/end range */
  private getUtcRangeFromLocalDate(
    localDateStr: string,
    timezone: string,
  ): {
    startUtc: Date;
    endUtc: Date;
  } {
    const [year, month, day] = localDateStr.split('-').map(Number);
    // Create a date representing midnight using the date components
    // fromZonedTime will interpret this date's local time components (year, month, day, hour)
    // as if they represent local time in the specified timezone, then convert to UTC.
    // This correctly handles DST transitions because fromZonedTime uses the timezone database.
    const naiveDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    console.log('Helper - naiveDate (components):', {
      year,
      month: month - 1,
      day,
      iso: naiveDate.toISOString(),
    });
    console.log('Helper - timezone:', timezone);
    // fromZonedTime treats the date as if it represents local time in the target timezone
    // and returns the UTC equivalent. This handles DST correctly.
    const startUtc = fromZonedTime(naiveDate, timezone);
    console.log('Helper - startUtc:', startUtc.toISOString());
    const endUtc = addDays(startUtc, 1);
    console.log('Helper - endUtc:', endUtc.toISOString());
    return { startUtc, endUtc };
  }

  async findAll(
    request: {
      completedDate?: string;
      status?: string;
      token?: string;
      timeZone?: string;
    } = {},
  ): Promise<Task[]> {
    let { completedDate, status, token, timeZone } = request;

    console.log('timeZone', timeZone);

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    const accountId = this.extractAccountIdFromToken(token);

    if (status === 'true' && !completedDate) {
      const now = new Date();
      // If timezone is provided, get today's date in that timezone, otherwise use UTC
      if (timeZone) {
        completedDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
      } else {
        // Default to UTC if timezone not provided
        completedDate = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd');
        timeZone = 'UTC';
      }
      console.log(completedDate + ' line 100');
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.dependencyTask', 'dependencyTask')
      .leftJoinAndSelect('task.notes', 'notes')
      .where('task.deletedAt IS NULL')
      .andWhere('task.accountId = :accountId', { accountId });

    if (status === 'true') {
      queryBuilder.andWhere('task.completed = true');

      if (completedDate && timeZone) {
        // Use helper to get UTC interval
        const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
          completedDate,
          timeZone,
        );
        console.log('=== DATE FILTERING DEBUG ===');
        console.log('Input completedDate:', completedDate);
        console.log('Input timeZone:', timeZone);
        console.log('Server timezone offset:', new Date().getTimezoneOffset());
        console.log(
          'Filtering between UTC:',
          startUtc.toISOString(),
          'and',
          endUtc.toISOString(),
        );
        console.log('================================');
        queryBuilder.andWhere(
          'task.completedDate >= :startUtc AND task.completedDate < :endUtc',
          { startUtc, endUtc },
        );
      } else {
        queryBuilder.orderBy('task.completedDate', 'DESC').limit(10);
      }
    } else if (status === 'false') {
      queryBuilder
        .andWhere('task.completed = false')
        .orderBy('task.createdAt', 'DESC');
    }

    return queryBuilder.getMany();
  }

  private extractAccountIdFromToken(token: string): string {
    try {
      const payload = this.jwtService.decode(token);

      return payload.id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
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

    // Handle dependencyTask if dependencyTaskId is provided
    if (updateTaskDto.dependencyTaskId !== undefined) {
      if (updateTaskDto.dependencyTaskId) {
        task.dependencyTask = await this.taskRepository.findOne({
          where: { id: updateTaskDto.dependencyTaskId },
        });
      } else {
        task.dependencyTask = null;
      }
    }

    return this.taskRepository.save(task);
  }

  async toggleComplete(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Toggle completion status
    task.completed = !task.completed;

    // Set completedDate based on completion status
    if (task.completed) {
      task.completedDate = new Date();
      // Track goal progress when task is completed
      await this.goalsService.addProgressForMetric(
        task.account.id.toString(),
        GoalMetric.TASKS_COMPLETED,
        1,
      );
    } else {
      await this.goalsService.subtractProgressForMetric(
        task.account.id.toString(),
        GoalMetric.TASKS_COMPLETED,
        1,
      );
      task.completedDate = null;
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
