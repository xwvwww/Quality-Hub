import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Priority } from '@prisma/client';

export class CreateTestPlanDto {
  @IsUUID() projectId!: string;
  @IsString() @MinLength(2) @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() @MaxLength(100) environment?: string;
  @IsOptional() @IsString() @MaxLength(100) build?: string;
  @IsOptional() @IsString() @MaxLength(100) version?: string;
}

export class UpdateTestPlanDto extends PartialType(CreateTestPlanDto) {}

export class TestPlanQueryDto {
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100) pageSize = 20;
}

export class AddPlanCasesDto {
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsUUID('4', { each: true }) testCaseIds?: string[];
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
}
