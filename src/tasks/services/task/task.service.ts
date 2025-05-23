import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from 'src/accounts/entities/account.entity';
import { Task } from 'src/tasks/entities/task.entity';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';
import { AccountService } from 'src/accounts/services/account/account.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    private readonly accountService: AccountService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const { accountId, dependencyTaskId, ...rest } = createTaskDto;

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

  findAll(): Promise<Task[]> {
    return this.taskRepository.find({
      relations: ['account', 'dependencyTask', 'notes'],
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['account', 'dependencyTask', 'notes'],
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
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
    const result = await this.taskRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }
}
