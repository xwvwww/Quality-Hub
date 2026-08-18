import { ConflictException, NotFoundException } from '@nestjs/common';
import { TestCasesService } from './test-cases.service';

describe('TestCasesService', () => {
  it('rejects repository access to a project from another tenant', async () => {
    const prisma = { project: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    const service = new TestCasesService(prisma);
    await expect(service.folders('org-a', 'project-b')).rejects.toThrow(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'project-b', organizationId: 'org-a' } }));
  });

  it('does not delete a non-empty folder', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a', code: 'QA' }) },
      testCaseFolder: { findFirst: jest.fn().mockResolvedValue({ id: 'folder-a' }), count: jest.fn().mockResolvedValue(1), delete: jest.fn() },
      testCase: { count: jest.fn().mockResolvedValue(0) },
    } as any;
    const service = new TestCasesService(prisma);
    await expect(service.deleteFolder('org-a', 'project-a', 'folder-a')).rejects.toThrow(ConflictException);
    expect(prisma.testCaseFolder.delete).not.toHaveBeenCalled();
  });

  it('returns a stable project-scoped display ID', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a', code: 'SKZ' }) },
      testCase: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([[{ id: 'case-a', caseNumber: 42 }], 1]),
    } as any;
    const service = new TestCasesService(prisma);
    const result = await service.list('org-a', 'project-a', { page: 1, pageSize: 20, includeNested: false });
    expect(result.items[0].displayId).toBe('SKZ-TC-0042');
  });
});
