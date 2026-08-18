import { RunStatus } from '@prisma/client';
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
