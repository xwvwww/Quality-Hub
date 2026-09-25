import { AutomationFramework, AutomationRunStatus, RunStatus } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApiKeyDto { @IsUUID() projectId!: string; @IsString() @MinLength(2) @MaxLength(100) name!: string; }
export class AutomationResultItemDto {
  @IsString() @MinLength(1) @MaxLength(255) externalId!: string;
  @IsEnum(RunStatus) status!: RunStatus;
  @IsInt() @Min(0) @Max(86_400_000) durationMs!: number;
  @IsString() @MinLength(1) @MaxLength(80) framework!: string;
  @IsOptional() @IsString() @MaxLength(100) environment?: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
}
export class IngestAutomationDto { @IsArray() @ValidateNested({ each: true }) @Type(() => AutomationResultItemDto) results!: AutomationResultItemDto[]; }
export class CreateAutomationSuiteDto {
  @IsUUID() projectId!: string;
  @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsEnum(AutomationFramework) framework!: AutomationFramework;
  @IsString() @MinLength(1) @MaxLength(500) command!: string;
  @IsOptional() @IsString() @MaxLength(500) repository?: string;
  @IsOptional() @IsString() @MaxLength(150) branch?: string;
  @IsOptional() @IsString() @MaxLength(100) environment?: string;
}
export class UpdateAutomationRunDto {
  @IsEnum(AutomationRunStatus) status!: AutomationRunStatus;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) total?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) passed?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) failed?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) skipped?: number;
  @IsOptional() @IsInt() @Min(0) @Max(86_400_000) durationMs?: number;
  @IsOptional() @IsString() @MaxLength(100) commitSha?: string;
  @IsOptional() @IsString() @MaxLength(1000) reportUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) error?: string;
}
