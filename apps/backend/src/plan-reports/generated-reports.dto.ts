import { ReportFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateGeneratedReportDto {
  @IsUUID() testPlanId!: string;
  @IsOptional() @IsEnum(ReportFormat) format: ReportFormat = ReportFormat.PDF;
  @IsOptional() @IsBoolean() includeAttachments = true;
  @IsOptional() @IsBoolean() failedOnly = false;
}

export class GeneratedReportQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) pageSize = 20;
}
