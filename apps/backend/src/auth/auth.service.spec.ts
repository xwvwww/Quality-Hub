import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('returns the same safe response for an unknown password-reset email', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    await expect(new AuthService(prisma, {} as any).requestPasswordReset('missing@example.com')).resolves.toEqual(expect.objectContaining({ success: true }));
  });
  it('resolves the current refresh session without exposing its token', async () => {
    const prisma={refreshToken:{findUnique:jest.fn().mockResolvedValue({id:'session-1',revokedAt:null,expiresAt:new Date(Date.now()+60_000)})}} as any;
    await expect(new AuthService(prisma,{} as any).currentSession('raw-token')).resolves.toEqual({id:'session-1'});
  });
  it('does not reveal whether an account exists', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new AuthService(prisma, {} as any);
    await expect(service.login('missing@example.com', 'Password1!')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid password', async () => {
    const hash = await argon2.hash('right-password');
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isActive: true, passwordHash: hash, memberships: [] }) } } as any;
    const service = new AuthService(prisma, {} as any);
    await expect(service.login('admin@example.com', 'wrong-password')).rejects.toThrow('Неверный email или пароль');
  });

  it('keeps the system administrator out of the user portal', async () => {
    const passwordHash = await argon2.hash('Password1!');
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isActive: true, isSystemAdmin: true, passwordHash, memberships: [] }) } } as any;
    await expect(new AuthService(prisma, {} as any).login('admin@example.com', 'Password1!', 'user')).rejects.toThrow('административный портал');
  });

  it('keeps organization users out of the system admin portal', async () => {
    const passwordHash = await argon2.hash('Password1!');
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isActive: true, isSystemAdmin: false, passwordHash, memberships: [] }) } } as any;
    await expect(new AuthService(prisma, {} as any).login('qa@example.com', 'Password1!', 'admin')).rejects.toThrow('Нет прав системного администратора');
  });
});
