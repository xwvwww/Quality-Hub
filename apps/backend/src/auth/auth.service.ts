import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembershipRole } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { include: { organization: true } } },
    });
    if (!user?.isActive || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Пользователь не состоит в организации');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({ data: { organizationId: membership.organizationId, userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'USER', entityId: user.id } });
    return this.issue(user.id, user.email, membership.organizationId, membership.role);
  }

  async refresh(raw: string) {
    let payload: { sub: string; familyId: string };
    try {
      payload = await this.jwt.verifyAsync(raw, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Refresh token недействителен');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(raw) },
      include: { user: { include: { memberships: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.updateMany({ where: { familyId: stored.familyId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token отозван');
    }
    const membership = stored.user.memberships[0];
    if (!stored.user.isActive || !membership) throw new UnauthorizedException('Доступ отозван');
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issue(stored.user.id, stored.user.email, membership.organizationId, membership.role, stored.familyId);
  }

  async logout(raw?: string) {
    if (raw) await this.prisma.refreshToken.updateMany({ where: { tokenHash: this.hash(raw), revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  private async issue(sub: string, email: string, organizationId: string, role: MembershipRole, familyId: string = randomUUID()) {
    const claims = { sub, email, organizationId, role };
    const accessToken = await this.jwt.signAsync(claims, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as never });
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
    const refreshToken = await this.jwt.signAsync({ sub, familyId }, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: `${days}d` as never });
    await this.prisma.refreshToken.create({ data: { userId: sub, tokenHash: this.hash(refreshToken), familyId, expiresAt: new Date(Date.now() + days * 86_400_000) } });
    return { accessToken, refreshToken, user: { id: sub, email, organizationId, role } };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
