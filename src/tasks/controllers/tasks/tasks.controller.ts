import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import {
  CreateTaskDto,
  GetTasksRequest,
  UpdateTaskDto,
} from 'src/tasks/models/tasks.model';
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

  @Post('find-tasks')
  // @UseGuards(JwtAuthGuard)
  findAll(@Body() request: GetTasksRequest) {
    return this.taskService.findAll(request);
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
