import { BadRequestException, Injectable } from '@nestjs/common';
import { DefectStatus, RunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './analytics.dto';

type CaseResult = { status: RunStatus; durationSeconds: number | null; createdAt: Date; runCase: { testCase: { id: string; caseNumber: number; title: string }; testRun: { id: string; name: string; project: { code: string } } } };

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async get(organizationId: string, query: AnalyticsQueryDto) {
    const since = new Date(); since.setDate(since.getDate() - query.days + 1); since.setHours(0, 0, 0, 0);
    if (query.projectId && !await this.prisma.project.findFirst({ where: { id: query.projectId, organizationId } })) throw new BadRequestException('Проект не найден');
    const project = { organizationId, ...(query.projectId ? { id: query.projectId } : {}) };
    const runFilters = { ...(query.testPlanId ? { testPlanId: query.testPlanId } : {}), ...(query.environment ? { environment: query.environment } : {}) };
    const resultWhere = { createdAt: { gte: since }, ...(query.userId ? { executedById: query.userId } : {}), runCase: { testRun: { project, ...runFilters } } };
    const runWhere = { createdAt: { gte: since }, project, ...runFilters };
    const [results, runs, defects, testCaseCount] = await this.prisma.$transaction([
      this.prisma.testResult.findMany({ where: resultWhere, orderBy: { createdAt: 'asc' }, include: { runCase: { include: { testCase: { select: { id: true, caseNumber: true, title: true } }, testRun: { select: { id: true, name: true, project: { select: { code: true } } } } } } } }),
      this.prisma.testRun.findMany({ where: runWhere, orderBy: { createdAt: 'asc' }, include: { project: { select: { code: true } }, cases: { orderBy: { position: 'asc' }, include: { testCase: { select: { id: true, caseNumber: true, title: true } }, results: { orderBy: { createdAt: 'desc' }, take: 1, select: { durationSeconds: true } } } } } }),
      this.prisma.defect.findMany({ where: { createdAt: { gte: since }, project }, select: { status: true, severity: true, priority: true, testCaseId: true } }),
      this.prisma.testCase.count({ where: { project } }),
    ]);
    const typedResults = results as CaseResult[];
    const userIds = [...new Set(results.map(item => item.executedById))];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, email: true } });
    const dates = Array.from({ length: query.days }, (_, offset) => { const date = new Date(since); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); });
    const daily = dates.map(date => { const items = results.filter(item => item.createdAt.toISOString().slice(0, 10) === date); return { date, total: items.length, passed: items.filter(x => x.status === RunStatus.PASSED).length, failed: items.filter(x => x.status === RunStatus.FAILED).length, blocked: items.filter(x => x.status === RunStatus.BLOCKED).length, duration: items.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0) }; });
    const testers = users.map(user => { const items = results.filter(x => x.executedById === user.id); const passed = items.filter(x => x.status === RunStatus.PASSED).length; return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() || user.email, total: items.length, passed, failed: items.filter(x => x.status === RunStatus.FAILED).length, blocked: items.filter(x => x.status === RunStatus.BLOCKED).length, duration: items.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0), passRate: items.length ? Math.round(passed / items.length * 100) : 0 }; }).sort((a, b) => b.total - a.total);
    const caseHealth = this.caseHealth(typedResults);
    const runTrends = runs.map(run => { const executed = run.cases.filter(x => x.status !== RunStatus.NOT_RUN), passed = executed.filter(x => x.status === RunStatus.PASSED).length; return { id: run.id, name: run.name, projectCode: run.project.code, date: run.createdAt, total: run.cases.length, executed: executed.length, passRate: executed.length ? Math.round(passed / executed.length * 100) : 0 }; });
    const passed = results.filter(x => x.status === RunStatus.PASSED).length, failed = results.filter(x => x.status === RunStatus.FAILED).length, blocked = results.filter(x => x.status === RunStatus.BLOCKED).length, duration = results.reduce((sum, x) => sum + (x.durationSeconds ?? 0), 0);
    const passRate = results.length ? Math.round(passed / results.length * 100) : 0;
    const coverage = testCaseCount ? Math.round(new Set(results.map(item => item.runCase.testCase.id)).size / testCaseCount * 100) : 0;
    const stability = caseHealth.length ? Math.round(caseHealth.reduce((sum, item) => sum + item.stability, 0) / caseHealth.length) : 100;
    const readinessScore = Math.round(passRate * .55 + stability * .25 + coverage * .2);
    const terminalDefectStatuses = new Set<DefectStatus>([DefectStatus.CLOSED, DefectStatus.REJECTED]);
    const forecasts = runs.filter(run => !run.completedAt && run.cases.some(item => item.status === RunStatus.NOT_RUN)).map(run => { const completed = run.cases.filter(item => item.status !== RunStatus.NOT_RUN); const measured = completed.map(item => item.results[0]?.durationSeconds).filter((value): value is number => typeof value === 'number' && value > 0); const fallback = results.length ? Math.max(1, Math.round(duration / results.length)) : 60; const averageSeconds = measured.length ? Math.round(measured.reduce((sum, value) => sum + value, 0) / measured.length) : fallback; const remaining = run.cases.length - completed.length; return { id: run.id, name: run.name, projectCode: run.project.code, completed: completed.length, total: run.cases.length, remaining, averageSeconds, estimatedSeconds: remaining * averageSeconds }; }).sort((a, b) => b.remaining - a.remaining).slice(0, 8);
    return {
      period: { since, days: query.days },
      metrics: { testCases: testCaseCount, executions: results.length, passed, failed, blocked, passRate, duration, averageDuration: results.length ? Math.round(duration / results.length) : 0, runs: runs.length, defects: defects.length, openDefects: defects.filter(x => !terminalDefectStatuses.has(x.status)).length, coverage, stability, readinessScore, readiness: readinessScore >= 90 ? 'READY' : readinessScore >= 75 ? 'AT_RISK' : 'NOT_READY' },
      daily, testers, runTrends,
      problematicCases: caseHealth.filter(x => x.failed).sort((a, b) => b.failed - a.failed).slice(0, 10),
      flakyCases: caseHealth.filter(x => x.transitions >= 2 && x.total >= 3).sort((a, b) => b.transitions - a.transitions || a.stability - b.stability).slice(0, 20),
      regressions: caseHealth.filter(x => x.trend === 'REGRESSION').slice(0, 20),
      fixedCases: caseHealth.filter(x => x.trend === 'FIXED').slice(0, 20),
      slowCases: caseHealth.filter(x => x.averageDuration > 0).sort((a, b) => b.averageDuration - a.averageDuration).slice(0, 20),
      staleCases: caseHealth.filter(x => x.daysSinceExecution >= Math.max(7, Math.floor(query.days / 2))).sort((a, b) => b.daysSinceExecution - a.daysSinceExecution).slice(0, 20),
      forecasts,
      defectSeverities: this.count(defects.map(x => x.severity)), defectStatuses: this.count(defects.map(x => x.status)),
    };
  }

  caseHealth(results: CaseResult[]) {
    const groups = new Map<string, CaseResult[]>();
    for (const result of results) { const id = result.runCase.testCase.id; groups.set(id, [...(groups.get(id) ?? []), result]); }
    return [...groups.values()].map(items => {
      const ordered = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const statuses = ordered.map(item => item.status).filter(status => status === RunStatus.PASSED || status === RunStatus.FAILED || status === RunStatus.BLOCKED);
      let transitions = 0; for (let index = 1; index < statuses.length; index++) if (statuses[index] !== statuses[index - 1]) transitions++;
      const latest = statuses.at(-1), previous = statuses.at(-2), durations = ordered.map(item => item.durationSeconds).filter((value): value is number => typeof value === 'number' && value > 0);
      const tc = ordered[0].runCase.testCase, code = ordered[0].runCase.testRun.project.code, dominant = statuses.length ? Math.max(...Object.values(this.count(statuses))) : 0;
      return { id: tc.id, displayId: `${code}-TC-${String(tc.caseNumber).padStart(4, '0')}`, title: tc.title, total: statuses.length, passed: statuses.filter(x => x === RunStatus.PASSED).length, failed: statuses.filter(x => x === RunStatus.FAILED).length, blocked: statuses.filter(x => x === RunStatus.BLOCKED).length, transitions, stability: statuses.length ? Math.round(dominant / statuses.length * 100) : 100, averageDuration: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0, lastExecutedAt: ordered.at(-1)!.createdAt, daysSinceExecution: Math.max(0, Math.floor((Date.now() - ordered.at(-1)!.createdAt.getTime()) / 86400000)), trend: previous === RunStatus.PASSED && latest === RunStatus.FAILED ? 'REGRESSION' : previous === RunStatus.FAILED && latest === RunStatus.PASSED ? 'FIXED' : 'UNCHANGED' };
    });
  }

  private count(values: string[]) { return values.reduce<Record<string, number>>((all, value) => ({ ...all, [value]: (all[value] ?? 0) + 1 }), {}); }
}
