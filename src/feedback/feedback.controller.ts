import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackAdminGuard } from './feedback-admin.guard';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateFeedbackDto,
    @Req() req: Request & { user: { id: string | number } },
  ) {
    return this.feedbackService.create(dto, String(req.user.id));
  }

  @Get()
  @UseGuards(JwtAuthGuard, FeedbackAdminGuard)
  findAllForAdmin() {
    return this.feedbackService.findAllForAdmin();
  }
}
