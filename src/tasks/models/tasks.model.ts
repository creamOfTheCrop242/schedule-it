import { IsOptional, IsString, MinLength, IsUUID, ValidateIf } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  habitId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  /** Omit to leave unchanged; `null` or `""` clears the habit link. */
  @IsOptional()
  @ValidateIf(
    (_, v) => v !== undefined && v !== null && v !== '',
  )
  @IsUUID()
  habitId?: string | null;
}
