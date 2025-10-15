import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';
import { TaskService } from 'src/tasks/services/task/task.service';

@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createTaskDto: CreateTaskDto, @Req() req: any) {
    return this.taskService.create(createTaskDto, req.user.id);
  }

  @Get()
  // @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: Request,
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
  ) {
    return this.taskService.findAll({
      completedDate,
      status,
      token: req.cookies['access_token'],
      timeZone,
    });
  }

  @Get('counts')
  @UseGuards(JwtAuthGuard)
  getTaskCounts(@Req() req: any) {
    return this.taskService.getTaskCounts(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  update(@Body() updateTaskDto: UpdateTaskDto, @Req() req: any) {
    return this.taskService.update(updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
