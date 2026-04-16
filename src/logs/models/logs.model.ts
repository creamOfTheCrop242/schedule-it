import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export interface LogDto {
  id: string;
  name: string;
  description?: string;
  surroundings?: string;
  mood?: string;
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
}
