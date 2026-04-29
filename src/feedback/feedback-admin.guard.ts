import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { isFeedbackAdminEmail } from './feedback-admin.util';

@Injectable()
export class FeedbackAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { email?: string } }>();
    const email = req.user?.email;
    const raw = this.configService.get<string>('FEEDBACK_ADMIN_EMAILS');
    if (isFeedbackAdminEmail(email, raw)) {
      return true;
    }
    throw new ForbiddenException('Feedback inbox access denied');
  }
}
