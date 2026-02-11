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
  findAll(
    @Req() req: Request,
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
  ) {
    return this.logService.findAll({
      completedDate,
      status,
      token: req.cookies['access_token'],
      timeZone,
    });
  }

  @Get('counts')
  @UseGuards(JwtAuthGuard)
  getLogCounts(@Req() req: any) {
    return this.logService.getLogCounts(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.logService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateLogDto: UpdateLogDto) {
    return this.logService.update(updateLogDto, id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard)
  toggleComplete(@Param('id') id: string) {
    return this.logService.toggleComplete(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.logService.remove(id);
  }
}
