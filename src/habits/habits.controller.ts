import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreateHabitDto, UpdateHabitDto } from './habits.model';
import { HabitsService } from './habits.service';

@Controller('habits')
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Post()
  create(
    @Body() dto: CreateHabitDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.habitsService.create(dto, String(req.user.id));
  }

  @Get()
  findAll(@Req() req: Request & { user: { id: string | number } }) {
    return this.habitsService.findAll(String(req.user.id));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.habitsService.findOne(id, String(req.user.id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.habitsService.update(id, dto, String(req.user.id));
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.habitsService.remove(id, String(req.user.id));
  }
}
