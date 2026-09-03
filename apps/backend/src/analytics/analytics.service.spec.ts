import { RunStatus } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

const result = (status: RunStatus, day: number, durationSeconds = 10) => ({
  status,
  durationSeconds,
  createdAt: new Date(2026, 7, day),
  runCase: {
    testCase: { id: 'case-1', caseNumber: 7, title: 'Авторизация' },
    testRun: { id: `run-${day}`, name: 'Regression', project: { code: 'SKZ' } },
  },
});

describe('AnalyticsService quality intelligence', () => {
  const service = new AnalyticsService({} as never);

  it('detects a flaky case from repeated status transitions', () => {
    const [health] = service.caseHealth([
      result(RunStatus.PASSED, 1),
      result(RunStatus.FAILED, 2),
      result(RunStatus.PASSED, 3),
      result(RunStatus.FAILED, 4),
    ]);
    expect(health.transitions).toBe(3);
    expect(health.stability).toBe(50);
    expect(health.displayId).toBe('SKZ-TC-0007');
  });

  it('marks pass-to-fail as regression and calculates average duration', () => {
    const [health] = service.caseHealth([
      result(RunStatus.PASSED, 1, 20),
      result(RunStatus.FAILED, 2, 40),
    ]);
    expect(health.trend).toBe('REGRESSION');
    expect(health.averageDuration).toBe(30);
  });

  it('marks fail-to-pass as fixed', () => {
    const [health] = service.caseHealth([
      result(RunStatus.FAILED, 1),
      result(RunStatus.PASSED, 2),
    ]);
    expect(health.trend).toBe('FIXED');
  });
});
