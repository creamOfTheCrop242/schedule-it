import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export interface LogDto {
  id: string;
  name: string;
  description?: string;
  surroundings?: string;
  mood?: string;
  category?: string;
  startTime?: Date;
  endTime?: Date;
  completedDate?: Date;
  dependencyLogId?: string;
  accountId: string;
  noteIds?: string[];
  createdAt: Date;
  deletedAt?: Date;
}

export class CreateLogDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  surroundings?: string;

  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @IsOptional()
  @IsDateString()
  endTime?: Date;

  @IsOptional()
  @IsDateString()
  completedDate?: Date;

  @IsOptional()
  @IsUUID()
  dependencyLogId?: string;

  @IsOptional()
  @IsUUID()
  habitId?: string;

  @IsOptional()
  @IsUUID()
  personalGoalId?: string;
}

export class UpdateLogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  surroundings?: string;

  @IsOptional()
  @IsString()
  mood?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @IsOptional()
  @IsDateString()
  endTime?: Date;

  @IsOptional()
  @IsDateString()
  completedDate?: Date;

  @IsOptional()
  @IsUUID()
  dependencyLogId?: string;

  /** Omit to leave unchanged; `null` or `""` clears the habit link. */
  @IsOptional()
  @ValidateIf(
    (_, v) => v !== undefined && v !== null && v !== '',
  )
  @IsUUID()
  habitId?: string | null;

  /** Omit to leave unchanged; `null` or `""` clears the personal goal link. */
  @IsOptional()
  @ValidateIf(
    (_, v) => v !== undefined && v !== null && v !== '',
  )
  @IsUUID()
  personalGoalId?: string | null;
}
