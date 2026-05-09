import { Account } from 'src/accounts/entities/account.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type LogPeriodSummaryType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type LogPeriodSummaryStatus = 'OK' | 'FAILED';

@Entity('log_period_summary')
@Unique('UQ_log_period_summary_account_type_key', [
  'account',
  'periodType',
  'periodKey',
])
@Index('IDX_log_period_summary_account_period', ['account', 'periodType'])
export class LogPeriodSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'varchar', length: 8 })
  periodType: LogPeriodSummaryType;

  /** Stable key, e.g. 2026-05-09, 2026-W19, 2026-05, 2026 */
  @Column({ type: 'varchar', length: 16 })
  periodKey: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 16, default: 'OK' })
  status: LogPeriodSummaryStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  model: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
