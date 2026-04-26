import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { GoalScope } from 'src/goals/goals.model';

export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalScope)
  cadence?: GoalScope;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetPerPeriod?: number;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalScope)
  cadence?: GoalScope;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetPerPeriod?: number;
}
