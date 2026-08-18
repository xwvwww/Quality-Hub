import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, RefreshDto } from './dto';
import { Public } from './public.decorator';
import { JwtUser } from './auth.types';

const cookieName = 'quality_hub_refresh';
const adminCookieName = 'quality_hub_admin_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 15 * 60_000 } })
  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password, 'user');
    this.setRefreshCookie(res, result.refreshToken, cookieName, '/api/auth');
    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Public()
  @Throttle({ default: { limit: 8, ttl: 15 * 60_000 } })
  @Post('admin/login')
  async adminLogin(@Res({ passthrough: true }) res: Response, @Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password, 'admin');
    this.setRefreshCookie(res, result.refreshToken, adminCookieName, '/api/auth/admin');
    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.auth.requestPasswordReset(dto.email); }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    const raw = req.cookies?.[cookieName] ?? dto.refreshToken;
    if (!raw) throw new UnauthorizedException('Refresh token отсутствует');
    const result = await this.auth.refresh(raw, 'user');
    this.setRefreshCookie(res, result.refreshToken, cookieName, '/api/auth');
    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('admin/refresh')
  async adminRefresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    const raw = req.cookies?.[adminCookieName] ?? dto.refreshToken;
    if (!raw) throw new UnauthorizedException('Refresh token отсутствует');
    const result = await this.auth.refresh(raw, 'admin');
    this.setRefreshCookie(res, result.refreshToken, adminCookieName, '/api/auth/admin');
    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    await this.auth.logout(req.cookies?.[cookieName] ?? dto.refreshToken);
    res.clearCookie(cookieName, { path: '/api/auth' });
    return { success: true };
  }

  @Post('admin/logout')
  async adminLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    await this.auth.logout(req.cookies?.[adminCookieName] ?? dto.refreshToken);
    res.clearCookie(adminCookieName, { path: '/api/auth/admin' });
    return { success: true };
  }

  @Get('me')
  me(@Req() req: Request & { user: JwtUser }) { return req.user; }

  @Get('current-session')
  currentSession(@Req() req: Request) { return this.auth.currentSession(req.cookies?.[cookieName]); }

  private setRefreshCookie(res: Response, value: string, name: string, path: string) {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
    res.cookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path,
      maxAge: days * 86_400_000,
    });
  }
}
