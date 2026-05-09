import {
  BadRequestException,
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Express } from 'express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreateLogDto, UpdateLogDto } from 'src/logs/models/logs.model';
import { LogInsightsService } from 'src/logs/services/log-insights/log-insights.service';
import { LogVoiceService } from 'src/logs/services/log-voice/log-voice.service';
import { LogService } from 'src/logs/services/log/log.service';

const VOICE_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

@Controller('logs')
export class LogController {
  constructor(
    private readonly logService: LogService,
    private readonly logInsightsService: LogInsightsService,
    private readonly logVoiceService: LogVoiceService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createLogDto: CreateLogDto, @Req() req: any) {
    return this.logService.create(createLogDto, req.user.id);
  }

  @Post('voice-draft')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: VOICE_UPLOAD_MAX_BYTES },
    }),
  )
  voiceDraft(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Multipart field "audio" with a recording is required.',
      );
    }
    return this.logVoiceService.draftFromAudio(file);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Req() req: Request & { user: { id: string | number } },
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
    @Query('mood') mood?: string | string[],
    @Query('category') category?: string | string[],
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
      category: LogController.firstQueryValue(category),
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

  @Get('ai-summary')
  @UseGuards(JwtAuthGuard)
  getAiSummary(
    @Req() req: Request & { user: { id: string | number } },
    @Query('completedDate') completedDate?: string,
    @Query('status') status?: string,
    @Query('timeZone') timeZone?: string,
    @Query('mood') mood?: string | string[],
    @Query('category') category?: string | string[],
    @Query('search') search?: string | string[],
  ) {
    return this.logInsightsService.summarize(String(req.user.id), {
      completedDate,
      status,
      timeZone,
      mood: LogController.firstQueryValue(mood),
      category: LogController.firstQueryValue(category),
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
