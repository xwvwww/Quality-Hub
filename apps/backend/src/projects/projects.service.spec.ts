import { NotFoundException } from '@nestjs/common';
import { ProjectSortField } from './projects.dto';
import { ProjectsService } from './projects.service';
import { MembershipRole } from '@prisma/client';

describe('ProjectsService', () => {
  it('scopes project lists to the organization from the token', async () => {
    const prisma = {
      project: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    } as any;
    const service = new ProjectsService(prisma);
    await service.list('org-a', 'admin-a', MembershipRole.ADMIN, { page: 1, pageSize: 20, sortBy: ProjectSortField.CREATED_AT, sortOrder: 'desc' });
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-a' }) }));
  });

  it('does not return a project from another organization', async () => {
    const prisma = { project: { findFirst: jest.fn().mockResolvedValue(null) } } as any;
    const service = new ProjectsService(prisma);
    await expect(service.get('org-a', 'c831050c-3954-4d45-a49a-d3b275826fd7')).rejects.toThrow(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'c831050c-3954-4d45-a49a-d3b275826fd7', organizationId: 'org-a' } }));
  });

  it('uses server-side pagination', async () => {
    const prisma = {
      project: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([[], 45]),
    } as any;
    const service = new ProjectsService(prisma);
    const result = await service.list('org-a', 'admin-a', MembershipRole.ADMIN, { page: 2, pageSize: 20, sortBy: ProjectSortField.NAME, sortOrder: 'asc' });
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20, orderBy: { name: 'asc' } }));
    expect(result.meta).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
  });
  it('limits a non-admin to owned or assigned projects', async () => {
    const prisma={project:{findMany:jest.fn(),count:jest.fn()},$transaction:jest.fn().mockResolvedValue([[],0])} as any;
    await new ProjectsService(prisma).list('org-a','user-a',MembershipRole.QA_ENGINEER,{page:1,pageSize:20,sortBy:ProjectSortField.CREATED_AT,sortOrder:'desc'});
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:'org-a',OR:[{ownerId:'user-a'},{members:{some:{userId:'user-a'}}}]})}));
  });
});
