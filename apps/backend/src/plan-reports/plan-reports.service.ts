import { Injectable, NotFoundException } from '@nestjs/common';
import { RunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanReportsService {
  constructor(private prisma: PrismaService) {}

  async get(organizationId: string, id: string, failedOnly = false) {
    const plan = await this.prisma.testPlan.findFirst({
      where: { id, project: { organizationId } },
      include: {
        project: { select: { id: true, code: true, name: true } },
        cases: { orderBy: { position: 'asc' }, include: { testCase: { include: { versions: { orderBy: { version: 'desc' }, take: 1, include: { steps: { orderBy: [{ section: 'asc' }, { position: 'asc' }] } } } } } } },
        runs: { orderBy: { createdAt: 'desc' }, take: 2, include: { cases: { include: { results: { orderBy: { createdAt: 'desc' }, take: 1 } } } } },
      },
    });
    if (!plan) throw new NotFoundException('Тест-план не найден');

    const run = plan.runs[0] ?? null;
    const previousRun = plan.runs[1] ?? null;
    const runByCase = new Map(run?.cases.map((item) => [item.testCaseId, item]) ?? []);
    const previousByCase = new Map(previousRun?.cases.map((item) => [item.testCaseId, item]) ?? []);
    const defects = run ? await this.prisma.defect.findMany({ where: { testRunId: run.id }, select: { id: true, defectNumber: true, title: true, status: true, priority: true, severity: true, testCaseId: true } }) : [];
    const defectsByCase = new Map<string, typeof defects>();
    for (const defect of defects) {
      if (!defect.testCaseId) continue;
      const group = defectsByCase.get(defect.testCaseId) ?? [];
      group.push(defect);
      defectsByCase.set(defect.testCaseId, group);
    }
    const executorIds = [...new Set(run?.cases.flatMap((item) => item.results.map((result) => result.executedById)) ?? [])];
    const users = await this.prisma.user.findMany({ where: { id: { in: executorIds } }, select: { id: true, firstName: true, lastName: true, email: true } });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const counts = Object.fromEntries(Object.values(RunStatus).map((status) => [status, 0])) as Record<RunStatus, number>;
    let estimatedDuration = 0;
    let actualDuration = 0;

    const cases = plan.cases.map((entry) => {
      const runCase = runByCase.get(entry.testCaseId);
      const latest = runCase?.results[0];
      const version = entry.testCase.versions[0];
      const status = runCase?.status ?? RunStatus.NOT_RUN;
      const previousStatus = previousByCase.get(entry.testCaseId)?.status ?? null;
      counts[status]++;
      estimatedDuration += version?.durationSeconds ?? 0;
      actualDuration += latest?.durationSeconds ?? 0;
      return {
        id: entry.testCase.id,
        displayId: `${plan.project.code}-TC-${String(entry.testCase.caseNumber).padStart(4, '0')}`,
        title: entry.testCase.title,
        priority: entry.testCase.priority,
        type: entry.testCase.type,
        status,
        previousStatus,
        regression: status === RunStatus.FAILED && previousStatus === RunStatus.PASSED,
        fixed: status === RunStatus.PASSED && previousStatus === RunStatus.FAILED,
        estimatedDuration: version?.durationSeconds ?? 0,
        actualDuration: latest?.durationSeconds ?? 0,
        actualResult: latest?.actualResult ?? null,
        comment: latest?.comment ?? null,
        executedAt: latest?.createdAt ?? null,
        executor: latest ? usersById.get(latest.executedById) ?? null : null,
        description: version?.description ?? null,
        steps: version?.steps ?? [],
        defects: (defectsByCase.get(entry.testCaseId) ?? []).map((defect) => ({ ...defect, displayId: `${plan.project.code}-BUG-${String(defect.defectNumber).padStart(4, '0')}` })),
      };
    });
    const executed = cases.length - counts.NOT_RUN;
    const regressions = cases.filter((item) => item.regression).length;
    const fixed = cases.filter((item) => item.fixed).length;
    const previousExecuted = previousRun?.cases.filter((item) => item.status !== RunStatus.NOT_RUN) ?? [];
    const previousPassed = previousExecuted.filter((item) => item.status === RunStatus.PASSED).length;
    const previousPassRate = previousExecuted.length ? Math.round(previousPassed / previousExecuted.length * 100) : null;
    return {
      plan: { id: plan.id, name: plan.name, description: plan.description, startsAt: plan.startsAt, endsAt: plan.endsAt, environment: plan.environment, build: plan.build, version: plan.version, createdAt: plan.createdAt, project: plan.project },
      run: run ? { id: run.id, name: run.name, createdAt: run.createdAt, completedAt: run.completedAt } : null,
      comparison: previousRun ? { runId: previousRun.id, runName: previousRun.name, passRate: previousPassRate, passRateDelta: previousPassRate === null ? null : (executed ? Math.round(counts.PASSED / executed * 100) : 0) - previousPassRate, regressions, fixed } : null,
      metrics: { total: cases.length, executed, progress: cases.length ? Math.round(executed / cases.length * 100) : 0, passRate: executed ? Math.round(counts.PASSED / executed * 100) : 0, estimatedDuration, actualDuration, defects: defects.length, ...counts },
      cases: failedOnly ? cases.filter((testCase) => testCase.status === RunStatus.FAILED) : cases,
      scope: failedOnly ? 'FAILED_ONLY' : 'ALL',
      generatedAt: new Date(),
    };
  }
}
