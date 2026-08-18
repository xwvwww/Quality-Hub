import { IsBoolean, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class UpdateProfileDto { @IsString() @MinLength(2) @MaxLength(100) firstName!: string; @IsString() @MinLength(2) @MaxLength(100) lastName!: string; }
export class ChangePasswordDto { @IsString() @MinLength(8) @MaxLength(128) currentPassword!: string; @IsString() @MinLength(8) @MaxLength(128) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {message:'Новый пароль должен содержать строчную и заглавную буквы, цифру и специальный символ'}) newPassword!: string; }
export class UpdatePreferencesDto { @IsIn(['ru','en','kk']) locale!: string; @IsString() @MaxLength(80) timezone!: string; @IsBoolean() emailNotifications!: boolean; }
