import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Введите корректный email' })
  email!: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
