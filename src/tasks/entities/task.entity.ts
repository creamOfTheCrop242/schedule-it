import { Account } from 'src/accounts/entities/account.entity';
import { Log } from 'src/logs/entities/log.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('task')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** DB default supports TypeORM sync when adding NOT NULL `title` to a table that already has rows. */
  @Column({ type: 'text', default: 'Untitled task' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedDate: Date | null;

  /** Completion log created from this task (at most one log per task). */
  @OneToOne(() => Log, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'logId' })
  log: Log | null;

  @ManyToOne(() => Account, (account) => account.tasks, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
