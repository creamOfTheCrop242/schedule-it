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
import { CreateLogDto, UpdateLogDto } from 'src/logs/models/logs.model';
import { LogService } from 'src/logs/services/log/log.service';

@Controller('logs')
export class LogController {
  constructor(
    private readonly logService: LogService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createLogDto: CreateLogDto, @Req() req: any) {
    return this.logService.create(createLogDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: Request & { user: { id: string | number } },
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
    @Query('mood') mood?: string | string[],
    @Query('search') search?: string | string[],
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.logService.findAll({
      completedDate,
      status,
      accountId: String(req.user.id),
      timeZone,
      mood: LogController.firstQueryValue(mood),
      search: LogController.firstQueryValue(search),
      limit,
      offset,
    });
  }

  @Get('counts')
  @UseGuards(JwtAuthGuard)
  getLogCounts(@Req() req: any) {
    return this.logService.getLogCounts(String(req.user.id));
  }

  @Get('mood-options')
  @UseGuards(JwtAuthGuard)
  getMoodOptions(
    @Req() req: Request & { user: { id: string | number } },
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
    @Query('search') search?: string | string[],
  ) {
    return this.logService.findDistinctMoods({
      completedDate,
      status,
      accountId: String(req.user.id),
      timeZone,
      search: LogController.firstQueryValue(search),
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

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    return this.logService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateLogDto: UpdateLogDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.logService.update(updateLogDto, id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: Request & { user: { id: string } }) {
    return this.logService.remove(id, req.user.id);
  }
}
