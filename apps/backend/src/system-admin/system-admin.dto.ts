import { MembershipRole } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
export class CreateOrganizationDto { @IsString() @MinLength(2) @MaxLength(150) name!:string; @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) slug!:string; }
export class UpdateOrganizationDto { @IsOptional() @IsString() @MinLength(2) @MaxLength(150) name?:string; @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) slug?:string; }
export class CreateSystemUserDto { @IsEmail() email!:string; @IsString() @MinLength(3) @MaxLength(80) username!:string; @IsString() @MinLength(2) @MaxLength(100) firstName!:string; @IsString() @MinLength(2) @MaxLength(100) lastName!:string; @IsString() @MinLength(8) password!:string; @IsUUID() organizationId!:string; @IsEnum(MembershipRole) role!:MembershipRole; }
export class UpdateSystemUserDto { @IsOptional() @IsString() @MinLength(2) @MaxLength(100) firstName?:string; @IsOptional() @IsString() @MinLength(2) @MaxLength(100) lastName?:string; @IsOptional() @IsBoolean() isActive?:boolean; @IsOptional() @IsUUID() organizationId?:string; @IsOptional() @IsEnum(MembershipRole) role?:MembershipRole; }
export class UpdateSystemProfileDto { @IsString() @MinLength(2) @MaxLength(100) firstName!:string; @IsString() @MinLength(2) @MaxLength(100) lastName!:string; }
export class ResetSystemUserPasswordDto { @IsString() @MinLength(8) @MaxLength(128) password!:string; }
