import { Account } from 'src/accounts/entities/account.entity';
import { Note } from 'src/notes/entities/note.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';

export type LogPriority = 'Low' | 'Medium' | 'High';

@Entity('log')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  surroundings: string | null;

  @Column({ type: 'text', nullable: true })
  mood: string | null;

  @Column({
    type: 'enum',
    enum: ['Low', 'Medium', 'High'],
    enumName: 'log_priority_enum',
    default: 'Medium',
  })
  priority: LogPriority;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedDate: Date | null;

  @ManyToOne(() => Log, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'dependencyLogId' })
  dependencyLog: Log | null;

  @OneToMany(() => Note, (note) => note.log)
  notes: Note[];

  @ManyToOne(() => Account, (account) => account.logs, { nullable: false })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
