import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MembershipRole } from '@prisma/client';

export class ListUsersDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(MembershipRole) role?: MembershipRole;
  @IsOptional() @IsBoolean() @Type(() => Boolean) active?: boolean;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize = 20;
}
export class CreateUserDto {
  @IsEmail() @MaxLength(255) email!: string;
  @IsString() @MinLength(3) @MaxLength(80) @Matches(/^[a-zA-Z0-9._-]+$/) username!: string;
  @IsString() @MinLength(2) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(2) @MaxLength(100) lastName!: string;
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {message:'Пароль должен содержать строчную и заглавную буквы, цифру и специальный символ'}) password!: string;
  @IsEnum(MembershipRole) role!: MembershipRole;
}
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) lastName?: string;
  @IsOptional() @IsEnum(MembershipRole) role?: MembershipRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class ResetPasswordDto { @IsString() @MinLength(8) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/) password!: string; }
export class ListAuditDto {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize = 30;
}
