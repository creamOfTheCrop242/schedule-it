import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePersonalGoalDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** `YYYY-MM-DD` or ISO date; omit for no target. */
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class UpdatePersonalGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Omit = unchanged; `null` or `""` clears target date. */
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null && v !== '')
  @IsDateString()
  targetDate?: string | null;
}
