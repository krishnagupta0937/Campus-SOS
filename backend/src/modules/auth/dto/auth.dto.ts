import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  mfa_token: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class UpdateSettingsDto {
  notifications_enabled?: boolean;
}
