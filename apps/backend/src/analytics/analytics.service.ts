import { BadRequestException, Injectable } from '@nestjs/common';
import { DefectStatus, RunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}
  async get(organizationId: string, query: AnalyticsQueryDto) {
    const since = new Date(); since.setDate(since.getDate() - query.days + 1); since.setHours(0, 0, 0, 0);
    if (query.projectId && !await this.prisma.project.findFirst({ where: { id: query.projectId, organizationId } })) throw new BadRequestException('Проект не найден');
    const project = { organizationId, ...(query.projectId ? { id: query.projectId } : {}) };
    const resultWhere = { createdAt: { gte: since }, ...(query.userId ? { executedById: query.userId } : {}), runCase: { testRun: { project, ...(query.testPlanId ? { testPlanId: query.testPlanId } : {}) } } };
    const runWhere = { createdAt: { gte: since }, project, ...(query.testPlanId ? { testPlanId: query.testPlanId } : {}) };
    const defectWhere = { createdAt: { gte: since }, project };
    const [results, runs, defects, testCaseCount] = await this.prisma.$transaction([
      this.prisma.testResult.findMany({ where: resultWhere, orderBy: { createdAt: 'asc' }, include: { runCase: { include: { testCase: { select: { id: true, caseNumber: true, title: true } }, testRun: { select: { id: true, name: true, project: { select: { code: true } } } } } } } }),
      this.prisma.testRun.findMany({ where: runWhere, orderBy: { createdAt: 'asc' }, include: { project: { select: { code: true } }, cases: { select: { status: true } } } }),
      this.prisma.defect.findMany({ where: defectWhere, select: { status: true, severity: true, priority: true, testCaseId: true } }),
      this.prisma.testCase.count({ where: { project } }),
    ]);
    const userIds = [...new Set(results.map(item => item.executedById))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } });
    const dates = Array.from({ length: query.days }, (_, offset) => { const date = new Date(since); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); });
    const daily = dates.map(date => { const items = results.filter(item => item.createdAt.toISOString().slice(0, 10) === date); return { date, total: items.length, passed: items.filter(x => x.status === RunStatus.PASSED).length, failed: items.filter(x => x.status === RunStatus.FAILED).length, blocked: items.filter(x => x.status === RunStatus.BLOCKED).length, duration: items.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0) }; });
    const testers = users.map(user => { const items = results.filter(x => x.executedById === user.id); const passed = items.filter(x => x.status === RunStatus.PASSED).length; return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() || user.email, total: items.length, passed, failed: items.filter(x => x.status === RunStatus.FAILED).length, blocked: items.filter(x => x.status === RunStatus.BLOCKED).length, duration: items.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0), passRate: items.length ? Math.round(passed / items.length * 100) : 0 }; }).sort((a, b) => b.total - a.total);
    const failedByCase = new Map<string, { id: string; displayId: string; title: string; failed: number; total: number }>();
    for (const item of results) { const tc = item.runCase.testCase, current = failedByCase.get(tc.id) ?? { id: tc.id, displayId: `${item.runCase.testRun.project.code}-TC-${String(tc.caseNumber).padStart(4, '0')}`, title: tc.title, failed: 0, total: 0 }; current.total++; if (item.status === RunStatus.FAILED) current.failed++; failedByCase.set(tc.id, current); }
    const runTrends = runs.map(run => { const executed = run.cases.filter(x => x.status !== RunStatus.NOT_RUN), passed = executed.filter(x => x.status === RunStatus.PASSED).length; return { id: run.id, name: run.name, projectCode: run.project.code, date: run.createdAt, total: run.cases.length, executed: executed.length, passRate: executed.length ? Math.round(passed / executed.length * 100) : 0 }; });
    const passed = results.filter(x => x.status === RunStatus.PASSED).length, failed = results.filter(x => x.status === RunStatus.FAILED).length, blocked = results.filter(x => x.status === RunStatus.BLOCKED).length, duration = results.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0);
    const terminalDefectStatuses = new Set<DefectStatus>([DefectStatus.CLOSED, DefectStatus.REJECTED]);
    return { period: { since, days: query.days }, metrics: { testCases: testCaseCount, executions: results.length, passed, failed, blocked, passRate: results.length ? Math.round(passed / results.length * 100) : 0, duration, averageDuration: results.length ? Math.round(duration / results.length) : 0, runs: runs.length, defects: defects.length, openDefects: defects.filter(x => !terminalDefectStatuses.has(x.status)).length }, daily, testers, runTrends, problematicCases: [...failedByCase.values()].filter(x => x.failed).sort((a, b) => b.failed - a.failed).slice(0, 10), defectSeverities: this.count(defects.map(x => x.severity)), defectStatuses: this.count(defects.map(x => x.status)) };
  }
  private count(values: string[]) { return values.reduce<Record<string, number>>((all, value) => ({ ...all, [value]: (all[value] ?? 0) + 1 }), {}); }
}
