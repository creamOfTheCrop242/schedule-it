import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from './entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

export type FeedbackListItem = {
  id: number;
  createdAt: Date;
  message: string;
  accountId: number;
  submitterName: string;
  submitterEmail: string;
};

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
  ) {}

  async create(
    dto: CreateFeedbackDto,
    accountId: string,
  ): Promise<Feedback> {
    const row = this.feedbackRepo.create({
      message: dto.message.trim(),
      accountId: Number(accountId),
    });
    return this.feedbackRepo.save(row);
  }

  async findAllForAdmin(): Promise<FeedbackListItem[]> {
    const rows = await this.feedbackRepo.find({
      relations: ['account'],
      order: { createdAt: 'DESC' },
    });

    return rows.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      message: f.message,
      accountId: f.accountId,
      submitterName: f.account?.name ?? '',
      submitterEmail: f.account?.email ?? '',
    }));
  }
}
