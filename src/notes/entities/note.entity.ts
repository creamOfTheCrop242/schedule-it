import { Account } from 'src/accounts/entities/account.entity';
import { Log } from 'src/logs/entities/log.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Account, (account) => account.notes, { onDelete: 'CASCADE' })
  account: Account;

  @ManyToOne(() => Log, (log) => log.notes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  log: Log;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
