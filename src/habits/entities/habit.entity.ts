import { Account } from 'src/accounts/entities/account.entity';
import { GoalScope } from 'src/goals/goals.model';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('habit')
export class Habit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Same values as GoalScope: DAY, WEEK, MONTH, YEAR (local calendar in user TZ). */
  @Column({ type: 'text', default: GoalScope.DAY })
  cadence: GoalScope;

  /** Logs required per cadence period to count the period as satisfied for streaks. */
  @Column({ type: 'int', default: 1 })
  targetPerPeriod: number;

  @ManyToOne(() => Account, (account) => account.habits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
