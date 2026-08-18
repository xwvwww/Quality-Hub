import { ReportFormat, ReportJobStatus } from '@prisma/client';
import { GeneratedReportsWorker } from './generated-reports.worker';

const job = { id: 'job-1', organizationId: 'org-1', testPlanId: 'plan-1', status: ReportJobStatus.QUEUED, format: ReportFormat.JSON };

describe('GeneratedReportsWorker', () => {
  it('does not generate when another worker claimed the job', async () => {
    const prisma = { generatedReport: { findFirst: jest.fn().mockResolvedValue(job), updateMany: jest.fn().mockResolvedValue({ count: 0 }), update: jest.fn() } };
    const reports = { get: jest.fn() }; const documents = { pdf: jest.fn() };
    await new GeneratedReportsWorker(prisma as never, reports as never, documents as never).tick();
    expect(reports.get).not.toHaveBeenCalled();
    expect(prisma.generatedReport.update).not.toHaveBeenCalled();
  });

  it('marks a claimed job as failed without exposing a long internal error', async () => {
    const prisma = { generatedReport: {
      findFirst: jest.fn().mockResolvedValue(job), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockResolvedValue({}),
    } };
    const reports = { get: jest.fn().mockRejectedValue(new Error('x'.repeat(2_000))) };
    await new GeneratedReportsWorker(prisma as never, reports as never, { pdf: jest.fn() } as never).tick();
    expect(prisma.generatedReport.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ReportJobStatus.FAILED, error: 'Не удалось сформировать отчёт. Повторите позже' }) }));
  });
});
