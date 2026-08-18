import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto';
import { Public } from './public.decorator';
import { JwtUser } from './auth.types';

const attempts = new Map<string, { count: number; reset: number }>();
const cookieName = 'quality_hub_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: LoginDto) {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = attempts.get(key);
    if (entry && entry.reset > now && entry.count >= 8) throw new HttpException('Слишком много попыток входа. Повторите через 15 минут', HttpStatus.TOO_MANY_REQUESTS);
    try {
      const result = await this.auth.login(dto.email, dto.password);
      attempts.delete(key);
      this.setRefreshCookie(res, result.refreshToken);
      const { refreshToken: _, ...safeResult } = result;
      return safeResult;
    } catch (error) {
      const current = entry && entry.reset > now ? entry : { count: 0, reset: now + 15 * 60_000 };
      current.count++;
      attempts.set(key, current);
      throw error;
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    const raw = req.cookies?.[cookieName] ?? dto.refreshToken;
    if (!raw) throw new UnauthorizedException('Refresh token отсутствует');
    const result = await this.auth.refresh(raw);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() dto: RefreshDto) {
    await this.auth.logout(req.cookies?.[cookieName] ?? dto.refreshToken);
    res.clearCookie(cookieName, { path: '/api/auth' });
    return { success: true };
  }

  @Get('me')
  me(@Req() req: Request & { user: JwtUser }) { return req.user; }

  private setRefreshCookie(res: Response, value: string) {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
    res.cookie(cookieName, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: days * 86_400_000,
    });
  }
}
