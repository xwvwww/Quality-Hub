import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RunStatus } from '@prisma/client';
import { TestRunsService } from './test-runs.service';

describe('TestRunsService', () => {
  it('rejects access across tenants', async () => { const prisma={testRun:{findFirst:jest.fn().mockResolvedValue(null)}} as never; await expect(new TestRunsService(prisma).complete('org-a','run-b')).rejects.toThrow(NotFoundException); });
  it('does not create a run from an empty plan', async () => { const prisma={project:{findFirst:jest.fn().mockResolvedValue({id:'p'})},testPlan:{findFirst:jest.fn().mockResolvedValue({cases:[]})}} as never; await expect(new TestRunsService(prisma).create('o','u',{projectId:'p',testPlanId:'t',name:'Run'})).rejects.toThrow(BadRequestException); });
  it('creates a run containing more than 700 test cases', async () => {
    const cases=Array.from({length:750},(_,index)=>({testCaseId:`case-${index}`}));
    const create=jest.fn().mockResolvedValue({id:'run',_count:{cases:750}});
    const prisma={project:{findFirst:jest.fn().mockResolvedValue({id:'p'})},testPlan:{findFirst:jest.fn().mockResolvedValue({cases,build:null,environment:null})},testRun:{create}} as never;
    await new TestRunsService(prisma).create('o','u',{projectId:'p',testPlanId:'t',name:'Large run'});
    expect(create.mock.calls[0][0].data.cases.create).toHaveLength(750);
  });
  it('calculates progress in list', async () => { const prisma={testRun:{findMany:jest.fn(),count:jest.fn()},$transaction:jest.fn().mockResolvedValue([[{cases:[{status:RunStatus.PASSED},{status:RunStatus.NOT_RUN}]}],1])} as never; const result=await new TestRunsService(prisma).list('o',{page:1,pageSize:20});expect(result.items[0].summary.progress).toBe(50); });
  it('returns a lightweight tenant-scoped overview', async () => { const prisma={testRun:{findFirst:jest.fn().mockResolvedValue({id:'r',cases:[{status:RunStatus.PASSED},{status:RunStatus.NOT_RUN}]})}} as never; const result=await new TestRunsService(prisma).overview('org','r');expect(result).not.toHaveProperty('cases');expect(result.summary.progress).toBe(50); });
  it('paginates run cases and scopes attachments to the tenant', async () => {
    const prisma={testRun:{findFirst:jest.fn().mockResolvedValue({id:'r',project:{code:'SKZ'}})},testRunCase:{findMany:jest.fn(),count:jest.fn()},attachment:{findMany:jest.fn().mockResolvedValue([])},$transaction:jest.fn().mockResolvedValue([[{id:'rc',status:RunStatus.NOT_RUN,testCase:{caseNumber:7,versions:[{steps:[]}]},results:[]}],700])} as never;
    const result=await new TestRunsService(prisma).cases('org','r',{page:2,pageSize:50});
    expect(result.meta).toEqual(expect.objectContaining({page:2,total:700,totalPages:14}));
    expect(result.items[0].testCase.displayId).toBe('SKZ-TC-0007');
    expect((prisma as any).attachment.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:'org',entityId:{in:['rc']}})}));
  });
  it('saves a result without rebuilding all case details', async () => {
    const prisma={testRunCase:{findFirst:jest.fn().mockResolvedValue({id:'rc',testCase:{versions:[{steps:[]}]}}),update:jest.fn(),findMany:jest.fn().mockResolvedValue([{status:RunStatus.PASSED},{status:RunStatus.NOT_RUN}])},testResult:{create:jest.fn()},testRun:{update:jest.fn()},$transaction:jest.fn().mockResolvedValue([])} as never;
    const result=await new TestRunsService(prisma).saveResultFast('org','run','rc','user',{status:RunStatus.PASSED,durationSeconds:5});
    expect(result.summary.progress).toBe(50);
    expect((prisma as any).testRun.update).not.toHaveBeenCalled();
  });
});
