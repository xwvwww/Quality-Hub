import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { EntityStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MinLength(2, { message: 'Название должно содержать минимум 2 символа' })
  @MaxLength(255, { message: 'Максимальная длина названия — 255 символов' })
  name!: string;

  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @Matches(/^[A-Z][A-Z0-9_-]{1,11}$/, { message: 'Код должен содержать 2–12 латинских букв, цифр, _ или -' })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export enum ProjectSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  CODE = 'code',
  STATUS = 'status',
}

export class ProjectQueryDto {
  @IsOptional() @IsString() @MaxLength(255)
  search?: string;

  @IsOptional() @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100)
  pageSize = 20;

  @IsOptional() @IsEnum(ProjectSortField)
  sortBy: ProjectSortField = ProjectSortField.CREATED_AT;

  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
