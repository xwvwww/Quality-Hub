import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}
  async search(organizationId: string, raw: string) {
    const query = raw.trim(); if (query.length < 2) return [];
    const number = /^\d+$/.test(query) ? Number(query) : undefined;
    const [projects, cases, plans, runs, defects, requirements] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where: { organizationId, OR: [{ name: { contains: query, mode: 'insensitive' } }, { code: { contains: query, mode: 'insensitive' } }] }, select: { id: true, code: true, name: true }, take: 5 }),
      this.prisma.testCase.findMany({ where: { project: { organizationId }, OR: [{ title: { contains: query, mode: 'insensitive' } }, ...(number ? [{ caseNumber: number }] : [])] }, include: { project: { select: { code: true } } }, take: 8 }),
      this.prisma.testPlan.findMany({ where: { project: { organizationId }, name: { contains: query, mode: 'insensitive' } }, include: { project: { select: { code: true } } }, take: 5 }),
      this.prisma.testRun.findMany({ where: { project: { organizationId }, name: { contains: query, mode: 'insensitive' } }, include: { project: { select: { code: true } } }, take: 5 }),
      this.prisma.defect.findMany({ where: { project: { organizationId }, OR: [{ title: { contains: query, mode: 'insensitive' } }, ...(number ? [{ defectNumber: number }] : [])] }, include: { project: { select: { code: true } } }, take: 8 }),
      this.prisma.requirement.findMany({ where: { project: { organizationId }, OR: [{ title: { contains: query, mode: 'insensitive' } }, ...(number ? [{ requirementNumber: number }] : [])] }, include: { project: { select: { code: true } } }, take: 8 }),
    ]);
    return [
      ...projects.map(x => ({ type: 'PROJECT', id: x.id, title: x.name, subtitle: x.code, url: '/projects' })),
      ...cases.map(x => ({ type: 'TEST_CASE', id: x.id, title: x.title, subtitle: `${x.project.code}-TC-${String(x.caseNumber).padStart(4, '0')}`, url: `/test-cases/${x.id}` })),
      ...plans.map(x => ({ type: 'TEST_PLAN', id: x.id, title: x.name, subtitle: x.project.code, url: `/test-plans/${x.id}` })),
      ...runs.map(x => ({ type: 'TEST_RUN', id: x.id, title: x.name, subtitle: x.project.code, url: `/test-runs/${x.id}` })),
      ...defects.map(x => ({ type: 'DEFECT', id: x.id, title: x.title, subtitle: `${x.project.code}-BUG-${String(x.defectNumber).padStart(4, '0')}`, url: '/defects' })),
      ...requirements.map(x => ({ type: 'REQUIREMENT', id: x.id, title: x.title, subtitle: `${x.project.code}-REQ-${String(x.requirementNumber).padStart(4, '0')}`, url: `/requirements/${x.id}` })),
    ].slice(0, 30);
  }
  listNotifications(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  async read(userId: string, id: string) { await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } }); return { success: true }; }
  async readAll(userId: string) { await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } }); return { success: true }; }
}
