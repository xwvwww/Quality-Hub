import { RunStatus } from '@prisma/client';
import { PlanReportsService } from './plan-reports.service';

describe('PlanReportsService scale', () => {
  it('builds a 700-case report without quadratic lookups', async () => {
    const cases = Array.from({ length: 700 }, (_, index) => ({
      testCaseId: `case-${index}`,
      position: index,
      testCase: {
        id: `case-${index}`, caseNumber: index + 1, title: `Case ${index + 1}`, priority: 'MEDIUM', type: 'FUNCTIONAL',
        versions: [{ durationSeconds: 60, description: null, steps: Array.from({ length: 5 }, (__, step) => ({ id: `${index}-${step}`, section: 'ACTION', position: step, action: 'Action', expectedResult: 'Expected' })) }],
      },
    }));
    const prisma = {
      testPlan: { findFirst: jest.fn().mockResolvedValue({ id: 'plan', name: 'Load plan', description: null, startsAt: null, endsAt: null, environment: null, build: null, version: null, createdAt: new Date(), project: { id: 'project', code: 'LOAD', name: 'Load' }, cases, runs: [] }) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      defect: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const started = performance.now();
    const report = await new PlanReportsService(prisma).get('organization', 'plan');
    expect(report.metrics.total).toBe(700);
    expect(report.metrics.NOT_RUN).toBe(700);
    expect(report.metrics.estimatedDuration).toBe(42_000);
    expect(performance.now() - started).toBeLessThan(1_500);
  });
});
