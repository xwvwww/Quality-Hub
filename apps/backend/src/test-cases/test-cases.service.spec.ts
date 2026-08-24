import { ConflictException, NotFoundException } from '@nestjs/common';
import { TestCasesService } from './test-cases.service';
import { MembershipRole } from '@prisma/client';
import { BulkAction } from './test-cases.dto';

describe('TestCasesService', () => {
  it('rejects repository access to a project from another tenant', async () => {
    const prisma = { project: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    const service = new TestCasesService(prisma);
    await expect(service.folders('org-a', 'project-b', 'admin-a', MembershipRole.ADMIN)).rejects.toThrow(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'project-b', organizationId: 'org-a' } }));
  });

  it('does not delete a non-empty folder', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a', code: 'QA' }) },
      testCaseFolder: { findFirst: jest.fn().mockResolvedValue({ id: 'folder-a' }), count: jest.fn().mockResolvedValue(1), delete: jest.fn() },
      testCase: { count: jest.fn().mockResolvedValue(0) },
    } as any;
    const service = new TestCasesService(prisma);
    await expect(service.deleteFolder('org-a', 'project-a', 'admin-a', MembershipRole.ADMIN, 'folder-a')).rejects.toThrow(ConflictException);
    expect(prisma.testCaseFolder.delete).not.toHaveBeenCalled();
  });

  it('returns a stable project-scoped display ID', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a', code: 'SKZ' }) },
      testCase: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([[{ id: 'case-a', caseNumber: 42 }], 1]),
    } as any;
    const service = new TestCasesService(prisma);
    const result = await service.list('org-a', 'project-a', 'admin-a', MembershipRole.ADMIN, { page: 1, pageSize: 20, includeNested: false });
    expect(result.items[0].displayId).toBe('SKZ-TC-0042');
  });

  it('compacts display numbers after deleting a test case', async () => {
    const tx = {
      testCase: {
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ id: 'case-1', caseNumber: 1 }, { id: 'case-3', caseNumber: 3 }]),
        update: jest.fn(),
      },
      project: { update: jest.fn() },
    };
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-a', code: 'QA' }) },
      testCase: { count: jest.fn().mockResolvedValue(1) },
      $transaction: jest.fn((callback) => callback(tx)),
    } as any;
    const service = new TestCasesService(prisma);
    await service.bulk('org-a', 'project-a', 'lead-a', MembershipRole.QA_LEAD, { ids: ['case-2'], action: BulkAction.DELETE });
    expect(tx.testCase.update).toHaveBeenCalledWith({ where: { id: 'case-3' }, data: { caseNumber: 2 } });
    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: 'project-a' }, data: { nextTestCaseNumber: 3 } });
  });
});
