import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";
import { RunStatus } from "@prisma/client";

export class CreateTestRunDto { @IsUUID() projectId!: string; @IsUUID() testPlanId!: string; @IsString() @MinLength(2) @MaxLength(255) name!: string; @IsOptional() @IsString() @MaxLength(100) build?: string; @IsOptional() @IsString() @MaxLength(100) environment?: string; @IsOptional() @IsUUID() assigneeId?: string; }
export class TestRunQueryDto { @IsOptional() @IsUUID() projectId?: string; @IsOptional() @IsString() @MaxLength(255) search?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) pageSize = 20; }
export class TestRunCaseQueryDto { @IsOptional() @IsEnum(RunStatus) status?: RunStatus; @IsOptional() @IsString() @MaxLength(255) search?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) pageSize = 50; }
export class SaveStepResultDto { @IsUUID() stepId!: string; @IsEnum(RunStatus) status!: RunStatus; @IsOptional() @IsString() @MaxLength(2000) comment?: string; }
export class SaveTestResultDto { @IsEnum(RunStatus) status!: RunStatus; @IsOptional() @IsString() @MaxLength(20000) actualResult?: string; @IsOptional() @IsString() @MaxLength(10000) comment?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(31536000) durationSeconds?: number; @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SaveStepResultDto) stepResults?: SaveStepResultDto[]; }
export class AssignRunCaseDto { @IsOptional() @IsUUID() assigneeId?: string; }
export class BulkAssignRunCasesDto { @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsUUID('4', { each: true }) ids!: string[]; @IsOptional() @IsUUID() assigneeId?: string; }
export class MyTaskQueryDto extends TestRunCaseQueryDto { @IsOptional() @IsUUID() projectId?: string; }
export class RerunTestRunDto { @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsEnum(RunStatus, { each: true }) statuses?: RunStatus[]; }
