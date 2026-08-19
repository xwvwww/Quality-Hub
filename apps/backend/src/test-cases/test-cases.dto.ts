import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Priority, Severity, TestCaseStatus, TestType } from '@prisma/client';

export class CreateFolderDto {
  @IsString() @MinLength(1) @MaxLength(255)
  name!: string;
  @IsOptional() @IsUUID()
  parentId?: string;
}

export class UpdateFolderDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  name?: string;
  @IsOptional() @IsUUID()
  parentId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  position?: number;
}

export class TestStepDto {
  @IsString() @MinLength(1, { message: 'Действие шага обязательно' }) @MaxLength(10000)
  action!: string;
  @IsString() @MinLength(1, { message: 'Ожидаемый результат обязателен' }) @MaxLength(10000)
  expectedResult!: string;
}

export class CreateTestCaseDto {
  @IsString() @MinLength(2) @MaxLength(255)
  title!: string;
  @IsOptional() @IsUUID()
  folderId?: string;
  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;
  @IsOptional() @IsEnum(TestCaseStatus)
  status: TestCaseStatus = TestCaseStatus.READY;
  @IsOptional() @IsEnum(Priority)
  priority: Priority = Priority.MEDIUM;
  @IsOptional() @IsEnum(Severity)
  severity: Severity = Severity.MAJOR;
  @IsOptional() @IsEnum(TestType)
  type: TestType = TestType.FUNCTIONAL;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(31536000)
  durationSeconds = 0;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  preconditionSteps: TestStepDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  steps: TestStepDto[] = [];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  postconditionSteps: TestStepDto[] = [];
}

export class UpdateTestCaseDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(255)
  title?: string;
  @IsOptional() @IsUUID()
  folderId?: string;
  @IsOptional() @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;
  @IsOptional() @IsEnum(Priority)
  priority?: Priority;
  @IsOptional() @IsEnum(Severity)
  severity?: Severity;
  @IsOptional() @IsEnum(TestType)
  type?: TestType;
}

export class SaveTestCaseDto extends UpdateTestCaseDto {
  @IsOptional() @IsString() @MaxLength(10000)
  description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(31536000)
  durationSeconds = 0;
  @IsOptional() @IsString() @MaxLength(10000)
  preconditions?: string;
  @IsOptional() @IsString() @MaxLength(10000)
  postconditions?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  preconditionSteps: TestStepDto[] = [];
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  steps!: TestStepDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => TestStepDto)
  postconditionSteps: TestStepDto[] = [];
  @IsOptional() @IsBoolean()
  createNewVersion = false;
}

export class TestCaseQueryDto {
  @IsOptional() @IsString() @MaxLength(255)
  search?: string;
  @IsOptional() @IsUUID()
  folderId?: string;
  @IsOptional() @Transform(({ value }) => value === 'true')
  includeNested = false;
  @IsOptional() @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;
  @IsOptional() @IsEnum(Priority)
  priority?: Priority;
  @IsOptional() @IsEnum(TestType)
  type?: TestType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100)
  pageSize = 20;
}

export enum BulkAction { ARCHIVE = 'archive', DELETE = 'delete', MOVE = 'move', SET_PRIORITY = 'setPriority', SET_STATUS = 'setStatus' }
export class BulkTestCasesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @IsUUID('4', { each: true })
  ids!: string[];
  @IsEnum(BulkAction)
  action!: BulkAction;
  @IsOptional() @IsUUID()
  folderId?: string;
  @IsOptional() @IsEnum(Priority)
  priority?: Priority;
  @IsOptional() @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;
}
