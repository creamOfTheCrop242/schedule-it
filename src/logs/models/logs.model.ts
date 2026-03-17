import {
  IsString,
  IsOptional,
  IsIn,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export interface LogDto {
  id: string;
  name: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  startTime?: Date;
  endTime?: Date;
  completed: boolean;
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
  @IsIn(['Low', 'Medium', 'High'])
  priority?: 'Low' | 'Medium' | 'High';

  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @IsOptional()
  @IsDateString()
  endTime?: Date;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

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
  @IsIn(['Low', 'Medium', 'High'])
  priority?: 'Low' | 'Medium' | 'High';

  @IsOptional()
  @IsDateString()
  startTime?: Date;

  @IsOptional()
  @IsDateString()
  endTime?: Date;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsDateString()
  completedDate?: Date;

  @IsOptional()
  @IsUUID()
  dependencyLogId?: string;
}
