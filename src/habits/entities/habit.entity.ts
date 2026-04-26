import { Account } from 'src/accounts/entities/account.entity';
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
