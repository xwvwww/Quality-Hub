import { BadRequestException } from '@nestjs/common';
import { PerformanceService } from './performance.service';
describe('PerformanceService', () => {
  const service = new PerformanceService({} as any);
  const sla = { p95Ms: 250, maxErrorRate: 40, minThroughput: 1 };
  it('parses JMeter CSV and calculates label aggregates', () => {
    const body = ['timeStamp,elapsed,label,responseCode,success,bytes', '1000,100,Login,200,true,1000', '1100,300,Login,500,false,500', '1200,200,Search,200,true,750'].join('\n');
    const result = service.preview({ originalname: 'result.jtl', size: body.length, buffer: Buffer.from(body) }, sla);
    expect(result).toMatchObject({ sampleCount: 3, errorCount: 1, averageMs: 200, p95Ms: 300, receivedBytes: 2250, slaPassed: false });
    expect(result.labels).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Login', sampleCount: 2, errorCount: 1 })]));
  });
  it('parses XML JTL', () => {
    const body = '<testResults><httpSample t="125" ts="1000" s="true" lb="Home" by="42"/></testResults>';
    expect(service.preview({ originalname: 'result.jtl', size: body.length, buffer: Buffer.from(body) }, sla)).toMatchObject({ sampleCount: 1, p95Ms: 125, receivedBytes: 42 });
  });
  it('rejects XML entities', () => {
    const body = '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><testResults />';
    expect(() => service.preview({ originalname: 'result.jtl', size: body.length, buffer: Buffer.from(body) }, sla)).toThrow(BadRequestException);
  });
});
