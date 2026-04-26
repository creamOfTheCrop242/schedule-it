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
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';
import { TasksService } from 'src/tasks/services/tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateTaskDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.create(dto, String(req.user.id));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: Request & { user: { id: string | number } },
    @Query('completedDate') completedDate?: string,
    @Query('timeZone') timeZone?: string,
    @Query('search') search?: string | string[],
    @Query('completion') completion?: string | string[],
    @Query('category') category?: string | string[],
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tasksService.findAll(String(req.user.id), {
      completedDate,
      timeZone,
      search: TasksController.firstQueryValue(search),
      completion: TasksController.firstQueryValue(completion),
      category: TasksController.firstQueryValue(category),
      limit,
      offset,
    });
  }

  private static firstQueryValue(
    value: string | string[] | undefined,
  ): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.complete(id, String(req.user.id));
  }

  @Post(':id/reopen')
  @UseGuards(JwtAuthGuard)
  reopen(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.reopen(id, String(req.user.id));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.findOne(id, String(req.user.id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.update(id, dto, String(req.user.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.tasksService.remove(id, String(req.user.id));
  }
}
