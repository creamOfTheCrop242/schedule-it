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
import { CreatePersonalGoalDto, UpdatePersonalGoalDto } from './personal-goals.model';
import { PersonalGoalAdviceService } from './personal-goal-advice.service';
import { PersonalGoalsService } from './personal-goals.service';

@Controller('personal-goals')
@UseGuards(JwtAuthGuard)
export class PersonalGoalsController {
  constructor(
    private readonly personalGoalsService: PersonalGoalsService,
    private readonly personalGoalAdviceService: PersonalGoalAdviceService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePersonalGoalDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalsService.create(dto, String(req.user.id));
  }

  @Get()
  findAll(@Req() req: Request & { user: { id: string | number } }) {
    return this.personalGoalsService.findAll(String(req.user.id));
  }

  @Get(':id/logs')
  findLogsForGoal(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalsService.findLogsForPersonalGoal(
      id,
      String(req.user.id),
    );
  }

  @Post(':id/coaching')
  coaching(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalAdviceService.coaching(id, String(req.user.id));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalsService.findOne(id, String(req.user.id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonalGoalDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalsService.update(id, dto, String(req.user.id));
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.personalGoalsService.remove(id, String(req.user.id));
  }
}
