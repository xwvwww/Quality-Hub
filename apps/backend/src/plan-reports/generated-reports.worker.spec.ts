import { ReportFormat, ReportJobStatus } from '@prisma/client';
import { GeneratedReportsWorker } from './generated-reports.worker';
import { readFile } from 'fs/promises';

jest.mock('fs/promises', () => ({ mkdir: jest.fn().mockResolvedValue(undefined), writeFile: jest.fn().mockResolvedValue(undefined), readFile: jest.fn() }));

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

  it('embeds tenant-scoped evidence in a requested PDF', async () => {
    const pdfJob = { ...job, format: ReportFormat.PDF, includeAttachments: true };
    const prisma = {
      generatedReport: { findFirst: jest.fn().mockResolvedValue(pdfJob), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn().mockResolvedValue({}) },
      testRunCase: { findMany: jest.fn().mockResolvedValue([{ id: 'run-case-1', testCaseId: 'case-1' }]) },
      testStepResult: { findMany: jest.fn().mockResolvedValue([]) },
      attachment: { findMany: jest.fn().mockResolvedValue([{ entityType: 'TEST_RUN_CASE', entityId: 'run-case-1', fileName: 'proof.png', mimeType: 'image/png', size: 3, storageKey: 'run-results/proof.png' }]) },
    };
    const snapshot = { plan: { project: { code: 'SKZ' } }, run: { id: 'run-1' }, cases: [{ id: 'case-1' }], generatedAt: new Date() };
    const documents = { pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')) };
    jest.mocked(readFile).mockResolvedValue(Buffer.from('png'));
    await new GeneratedReportsWorker(prisma as never, { get: jest.fn().mockResolvedValue(snapshot) } as never, documents as never).tick();
    expect(prisma.attachment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }));
    expect(documents.pdf).toHaveBeenCalledWith(expect.objectContaining({ cases: [expect.objectContaining({ attachments: [expect.objectContaining({ fileName: 'proof.png' })] })] }));
  });
});
