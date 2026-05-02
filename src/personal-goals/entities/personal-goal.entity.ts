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

@Entity('personal_goal')
export class PersonalGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Calendar date only; null = no deadline. */
  @Column({ type: 'date', nullable: true })
  targetDate: string | null;

  @ManyToOne(() => Account, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
