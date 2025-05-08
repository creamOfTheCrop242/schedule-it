import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class EmailVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt?: Date;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  verified: boolean;

  @Column({ nullable: true })
  accountDetails: string;

  @Column({ nullable: true })
  code: string;

  @DeleteDateColumn()
  deletedAt?: Date;
}
