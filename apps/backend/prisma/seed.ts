import { MembershipRole, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed is disabled in production. Set ALLOW_DEMO_SEED=true only when explicitly required.');
  }
  const passwordHash = await argon2.hash('Admin123!');
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isSystemAdmin: true },
    create: { email: 'admin@example.com', username: 'admin', firstName: 'Alnur', lastName: 'Almen', passwordHash, isSystemAdmin: true },
  });
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-qa' },
    update: {},
    create: { name: 'Demo QA', slug: 'demo-qa' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: systemAdmin.id } },
    update: { role: MembershipRole.VIEWER },
    create: { organizationId: org.id, userId: systemAdmin.id, role: MembershipRole.VIEWER },
  });
  const qaAdmin = await prisma.user.upsert({
    where: { email: 'qa@example.com' },
    update: { isSystemAdmin: false },
    create: { email: 'qa@example.com', username: 'qa-admin', firstName: 'QA', lastName: 'Lead', passwordHash, isSystemAdmin: false },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: qaAdmin.id } },
    update: { role: MembershipRole.ADMIN },
    create: { organizationId: org.id, userId: qaAdmin.id, role: MembershipRole.ADMIN },
  });
  await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SKZ' } },
    update: { ownerId: qaAdmin.id },
    create: { organizationId: org.id, code: 'SKZ', name: 'ScanKZ', description: 'Тестирование системы ScanKZ', ownerId: qaAdmin.id },
  });
  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
