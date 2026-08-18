import { MembershipRole } from '@prisma/client';
export type JwtUser = { sub: string; email: string; organizationId: string; role: MembershipRole; systemAdmin: boolean };
