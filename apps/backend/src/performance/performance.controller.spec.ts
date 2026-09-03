import { PerformanceController } from './performance.controller';

describe('PerformanceController CI ingestion',()=>{
  const key={id:'key',organizationId:'org',projectId:'project',createdById:'user'};
  const file={originalname:'result.jtl',size:10,buffer:Buffer.from('test')};
  it('forces project scope from API key and returns a passing pipeline status',async()=>{
    const service={create:jest.fn().mockResolvedValue({id:'run',slaPassed:true})};
    const automation={authenticateKey:jest.fn().mockResolvedValue(key),markKeyUsed:jest.fn()};
    const response={status:jest.fn()};
    const result=await new PerformanceController(service as any,automation as any).ci('secret',file,{projectId:'attacker-project',name:'Build 12',p95Ms:'800'},response as any);
    expect(service.create).toHaveBeenCalledWith('org','user',expect.objectContaining({projectId:'project',name:'Build 12',sla:{p95Ms:800,maxErrorRate:1,minThroughput:1}}),file);
    expect(response.status).not.toHaveBeenCalled();expect(result).toMatchObject({pipelineStatus:'passed',exitCode:0});
  });
  it('persists a failed run and responds with 422 for curl --fail',async()=>{
    const service={create:jest.fn().mockResolvedValue({id:'run',slaPassed:false})};
    const automation={authenticateKey:jest.fn().mockResolvedValue(key),markKeyUsed:jest.fn()};
    const response={status:jest.fn()};
    const result=await new PerformanceController(service as any,automation as any).ci('secret',file,{},response as any);
    expect(response.status).toHaveBeenCalledWith(422);expect(result.exitCode).toBe(1);expect(automation.markKeyUsed).toHaveBeenCalledWith('key');
  });
});
