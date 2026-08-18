import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService', () => {
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
});
