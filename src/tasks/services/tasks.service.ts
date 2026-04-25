import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountService } from 'src/accounts/services/account/account.service';
import { CreateLogDto } from 'src/logs/models/logs.model';
import { LogService } from 'src/logs/services/log/log.service';
import { Task } from 'src/tasks/entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly accountService: AccountService,
    private readonly logService: LogService,
  ) {}

  private accountIdNum(accountId: string): number {
    const n = parseInt(accountId, 10);
    if (Number.isNaN(n)) {
      throw new ForbiddenException('Invalid account');
    }
    return n;
  }

  async create(dto: CreateTaskDto, accountId: string): Promise<Task> {
    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      account,
      completedDate: null,
      log: null,
    });
    return this.taskRepository.save(task);
  }

  async findAll(accountId: string): Promise<Task[]> {
    const accountIdNum = this.accountIdNum(accountId);
    return this.taskRepository.find({
      where: { account: { id: accountIdNum } },
      relations: ['log'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, accountId: string): Promise<Task> {
    const accountIdNum = this.accountIdNum(accountId);
    const task = await this.taskRepository.findOne({
      where: { id, account: { id: accountIdNum } },
      relations: ['log'],
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    accountId: string,
  ): Promise<Task> {
    const task = await this.findOne(id, accountId);
    if (dto.title !== undefined) {
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description ?? null;
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string, accountId: string): Promise<void> {
    await this.findOne(id, accountId);
    await this.taskRepository.softDelete(id);
  }

  /**
   * First completion: creates a log via LogService and links it. Idempotent if already completed.
   */
  async complete(id: string, accountId: string): Promise<Task> {
    const task = await this.findOne(id, accountId);
    if (task.log) {
      return task;
    }

    const completedDate = new Date();
    const createLogDto: CreateLogDto = {
      name: task.title,
      description: task.description ?? undefined,
      completedDate,
    };

    const savedLog = await this.logService.create(createLogDto, accountId);

    task.log = savedLog;
    task.completedDate = completedDate;
    return this.taskRepository.save(task);
  }
}
