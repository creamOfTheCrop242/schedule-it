import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Task } from 'src/tasks/entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';

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
    // midnight in local time
    const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
    console.log('Helper - startLocal:', startLocal.toISOString());
    console.log('Helper - timezone:', timezone);
    // Convert to UTC using the specified timezone
    const startUtc = fromZonedTime(startLocal, timezone);
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
    const { completedDate, status, token, timeZone } = request;

    console.log('timeZone', timeZone);

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    const accountId = this.extractAccountIdFromToken(token);

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

    task.completedDate = task.completedDate ? null : new Date();
    console.log('task.completedDate', task.completedDate);
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
