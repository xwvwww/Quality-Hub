import { MembershipRole, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error('Demo seed is disabled in production. Set ALLOW_DEMO_SEED=true only when explicitly required.');
  }
  const passwordHash = await argon2.hash('Admin123!');
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', username: 'admin', firstName: 'Alnur', lastName: 'Almen', passwordHash },
  });
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-qa' },
    update: {},
    create: { name: 'Demo QA', slug: 'demo-qa' },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: { role: MembershipRole.ADMIN },
    create: { organizationId: org.id, userId: user.id, role: MembershipRole.ADMIN },
  });
  await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SKZ' } },
    update: {},
    create: { organizationId: org.id, code: 'SKZ', name: 'ScanKZ', description: 'Тестирование системы ScanKZ', ownerId: user.id },
  });
  console.log('Seed complete: admin@example.com / Admin123!');
}

main().finally(() => prisma.$disconnect());
