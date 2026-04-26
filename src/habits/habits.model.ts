import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
