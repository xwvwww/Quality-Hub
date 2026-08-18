import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportFormat } from '@prisma/client';
import { GeneratedReportsService } from './generated-reports.service';

const dto = { testPlanId: '00000000-0000-4000-8000-000000000001', format: ReportFormat.PDF, includeAttachments: true };

describe('GeneratedReportsService', () => {
  it('does not queue a report for another tenant plan', async () => {
    const prisma = { testPlan: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    await expect(new GeneratedReportsService(prisma).create('org-a', 'user-a', dto)).rejects.toThrow(NotFoundException);
  });

  it('limits active jobs per organization', async () => {
    const prisma = { testPlan: { findFirst: jest.fn().mockResolvedValue({ id: dto.testPlanId }) }, generatedReport: { count: jest.fn().mockResolvedValue(5) } } as any;
    await expect(new GeneratedReportsService(prisma).create('org-a', 'user-a', dto)).rejects.toThrow(BadRequestException);
  });

  it('scopes report detail by organization', async () => {
    const prisma = { generatedReport: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    await expect(new GeneratedReportsService(prisma).detail('org-a', 'job-b')).rejects.toThrow(NotFoundException);
    expect(prisma.generatedReport.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'job-b', organizationId: 'org-a' } }));
  });
});
